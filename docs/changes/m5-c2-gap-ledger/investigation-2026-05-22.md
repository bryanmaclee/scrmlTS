# C2 Gap-Ledger Investigation — sizing the native-vs-live divergence

**Date:** 2026-05-22
**Scope:** read-only diagnostic. No compiler-source / test changes.
**Subject:** the M5-swap C2 dual-pipeline canary (`6ecb3051`) found
**261/1000 corpus files (26.1%) diverge** between the native parser's
`nativeParseFile` FileAST and the live BS+TAB FileAST. This doc sizes the
two dominant divergence classes and notes the other four.

---

## 1. The ledger summary

`classifyDivergence` partitions the ~1000-file `.scrml` corpus:

| Verdict | Count | Explained? |
|---|---:|---|
| `EXACT` | 727 | yes — strict-pass |
| `DEFERRAL-test-block` | 12 | yes — strict-pass (D2 deferral) |
| `DIFF-top-seq` | **77** | no — gap ledger |
| `GAP-state-block` | **68** | no — gap ledger |
| `DIFF-hoist-count` | 44 | no — gap ledger |
| `GAP-mixed` | 38 | no — gap ledger |
| `GAP-native-extra-block` | 30 | no — gap ledger |
| `DIFF-engine-in-nodes` | 4 | no — gap ledger |

Strict-pass = 739 (73.9%). Gap ledger = 261. Arithmetic reconciles
(77+68+44+38+30+4 = 261).

**Headline finding up front.** The two dominant classes are NOT two
independent problems. `GAP-state-block` (68) and the largest sub-bucket of
`DIFF-top-seq` (51) are the **same root cause** — the native parser has no
`<state>`/`< Ident>`-declaration *node* production — surfaced in two
different syntactic positions (top-level vs inside `${...}`). Counting the
overlap, **roughly 119 of the 261 gap files (46%) trace to one missing
production.** The ledger is more concentrated than the 6-class histogram
suggests.

---

## 2. Class 1 — `GAP-state-block` (68 files)

### Root cause

A `<state>` declaration — written `< statetype attr...>children</statetype>`
or the typed-decl form `< Name attr(Type)>` (§35.2, a
`state-constructor-def`) — is produced by the live pipeline as a `state` or
`state-constructor-def` `ASTNode` (`ast.ts:265` / `ast.ts:279`). The native
parser renders it as a plain `markup` node.

**This is NOT a missing parse-layer production.** The native parser already
recognizes the `< Ident>` space-after-`<` opener form
(`parse-markup.js:167-209`, `isStateTagBoundaryAfterLt` /
`isAsciiTagNameStart`) and routes it into `.InMarkupTag` with
`TagKind.StateOpener`. F7.a (`parse-state-body.js`) already ships a complete
shaper: `shapeStateBlock(block)` stamps `block.stateNodeKind`
(`"state"` | `"state-constructor-def"`), `block.stateType`, and
`block.typedAttrs` — exactly the live `StateNode`/`StateConstructorDefNode`
payload. There is even a ready-made read-side predicate, `isStateBlock(block)`
(`parse-state-body.js:86`), whose header explicitly says it is "the read-side
discriminator the M5 swap keys the state-vs-markup routing off."

**The gap is entirely in the C1 assembler.** `nativeParseFile`'s `mapOneBlock`
(`parse-file.js:184-241`) maps EVERY `Markup` BlockKind unconditionally to a
`markup` ASTNode via `synthMarkupNode` — it never calls `isStateBlock` and
has no `synthStateNode` synthesizer. The shaped state payload exists on the
block; the assembler throws it away. The canary header even names the cause
("the native parser has no `State` BlockKind") but the more precise statement
is: the native parser has the State *recognition* and the State *shaper* — it
is missing only the State *node synthesizer* in the FileAST assembler.

### How the A3 engine work compares

`<state>` is the **same shape of fix as the A3 engine synthesis**, and it is
*simpler*. A3 modelled engines as plain `Markup` blocks named `engine`/`machine`
and `collect-hoisted.js`'s `synthEngineDecl` synthesizes a 14-field
`EngineDeclNode` from attribute reads. `<state>` needs LESS work than that:

- the discriminator already exists (`isStateBlock` — A3 had to test
  `block.name === "engine"`);
- the payload is already shaped (`shapeStateBlock` ran at parse time and
  stamped `stateNodeKind`/`stateType`/`typedAttrs` — A3 had to derive every
  engine field at synthesis time);
- the `children` recursion already exists (`synthMarkupNode` recurses
  `mapBlocksToNodes`; a `synthStateNode` reuses it verbatim).

So this is **not** a new parse-layer production and **not** a
block-context-engine variant. It is one new synthesizer function in
`parse-file.js` plus a two-line dispatch branch in `mapOneBlock`.

### Fix shape

In `parse-file.js`:
1. `import { isStateBlock } from "./parse-state-body.js";`
2. In `mapOneBlock`, before the `kind === "Markup"` branch, add:
   `if (kind === "Markup" && isStateBlock(block)) return synthStateNode(...)`.
3. Add `synthStateNode(block, idGen, source, errors)` — emits
   `{ id, kind: block.stateNodeKind, stateType: block.stateType,
   attrs: block.attrs, typedAttrs: block.typedAttrs (constructor-def only),
   children: mapBlocksToNodes(block.children, ...), openerHadSpaceAfterLt,
   span }`. The field set is the live literal at `ast-builder.js:11304`
   (`state-constructor-def`) / `11317` (`state`).

**Caveats that widen the estimate slightly:**

- The live builder also stamps substate metadata (`isSubstate`/`parentState`,
  §54.2) and runs `collapseTransitionDecls` (§54.3 — collapses
  `text + logic` child pairs into `transition-decl` nodes) on the children.
  The native assembler does neither today. A *top-level-faithful*
  `synthStateNode` (enough to flip the 68 files to strict-pass) does NOT
  need either — the canary diffs only the top-level kind sequence + hoist
  counts, and `state`/`state-constructor-def` is the top kind regardless of
  child shaping. But a *deep*-faithful synth (needed before
  `--parser=scrml-native` can drive codegen) does. Recommend landing the
  shallow synth for the ledger flip and surfacing transition-decl collapse +
  substate metadata as a tracked follow-up.
- 4 of the 68 also carry a `hoist[typeDecls live=N native=0]` sub-diff (e.g.
  `state-010-struct-state-combo`, `modern-002-projection`). Those files have
  a co-occurring `DIFF-hoist-count` cause; closing `GAP-state-block` will
  reclassify them into `DIFF-hoist-count`, not into `EXACT`. Expect ~64 of
  the 68 to flip clean, ~4 to move sideways into the hoist-count bucket.

### One unit or several

**One clean unit.** One synthesizer + one dispatch branch + an import. The
transition-decl/substate deep-fidelity work is a *separate, optional* unit
that the ledger flip does not require.

### Cost estimate

- Shallow `synthStateNode` + dispatch + corpus re-verify: **~2–3 hours.**
- Deep fidelity (transition-decl collapse, substate metadata) as a tracked
  follow-up: **~4–6 hours**, not on the ledger-flip critical path.

### Recommendation

Land the shallow `synthStateNode` as a single small C-series unit. It is the
single highest-leverage fix in the ledger: it flips ~64 files directly AND
is a prerequisite for the largest `DIFF-top-seq` sub-bucket (see §3). Do it
first.

---

## 3. Class 2 — `DIFF-top-seq` (77 files)

The canary places a file here when the top-level node-kind SET matches but
the SEQUENCE (order/count) differs. All 77 were enumerated and diffed
(`liveTop` vs `nativeTop`). They decompose into **three** root-cause
sub-buckets — it is NOT one bug 77×, but it is also not 77 distinct causes.

### Sub-bucket 2a — `<state>`-inside-`${...}` splits out a top-level markup (51 files)

**Pattern.** `liveTop = comment,logic,text,markup,text`;
`nativeTop = comment,markup,logic,text,markup,text` — native inserts an
extra `markup` immediately before the `logic`, then realigns. Verified on a
15-file sample and bucket-wide: 51/54 of the `Δlen=+1` files match this
"insert-markup-then-realign" signature exactly.

**Root cause.** The file body is `${ <items> = [...] }` — a `<state>`
declaration *inside* a logic-escape block. The native
`dispatchInLogicEscape` (`parse-markup.js:824`) recognizes the `<items>`
opener via `recognizeContextEntryAt` and enters `.InMarkupTag`, producing a
`Markup` block. `recoverTagsInClosedContext` then emits that Markup element
into `ctx.nodes` — the **top-level** block list — so it surfaces as a
sibling of the `logic` node, not nested inside it. The live BS keeps
`<items> = [...]` as logic-body content (a state decl is a valid logic
statement). Confirmed on `phase2-for-lift-markup-048`: native top-level
nodes are `comment, markup "items", logic, text, markup "program", text`.

This is **the same missing `<state>` production as Class 1**, surfaced inside
a `${...}` context instead of at top level. Fixing the Class-1
`synthStateNode` does NOT by itself fix 2a — the problem here is upstream of
the assembler: the markup trampoline is *emitting a separate top-level Markup
block* for a tag that is logically inside the logic body. The fix is in the
markup layer: a `< Ident>` state opener inside `.InLogicEscape` must be
either (a) suppressed as logic-body content (the BS posture — `<` inside
`${}` is body text the JS layer owns), or (b) emitted as a child of the
LogicEscape block rather than a top-level sibling. Option (a) matches the
live BS exactly and is the §4.6 `<`-suppression contract the
`dispatchInLogicEscape` header already half-describes.

- **Assessment:** native-parser bug — a block-segmentation defect. The
  native trampoline over-recognizes `<state>` openers inside logic context.
- **Cost:** ~4–6 hours. The fix touches `dispatchInLogicEscape`'s
  context-entry branch (`parse-markup.js:871-877`) — a `< Ident>` state
  opener inside `.InLogicEscape` should not call `enterMarkupTagContext`.
  It needs care: a genuine markup-as-value `${ <div/> }` (charter Q1.C) MUST
  still be recognized, so the suppression must be specific to the
  state-opener form, or scoped by whether the `<...>` sits at statement
  position vs value position. Budget the higher end.

### Sub-bucket 2b — nested `${...}` emits a second top-level logic block (4 files)

**Pattern.** `nativeTop` has two (or three) adjacent `logic` nodes where
`liveTop` has one — `comment,logic,logic,text,markup,text`. Files:
`phase2-while-lift-061`, `phase2-match-optional-039`,
`phase2-match-payload-named-032`, `phase3-template-literal-060`.

**Root cause.** A nested `${ ... }` inside the outer `${ ... }` (verified:
`phase2-while-lift-061` literally nests `${` two deep). `dispatchInLogicEscape`
recognizes the nested `${` sigil and `enterBlockContext` opens a *new*
BlockContext frame; on its close `emitContextBlock` appends a SEPARATE
`LogicEscape` block to `ctx.nodes`. The live BS folds the inner `${}` into
the outer logic block's body text. `phase2-match-payload-named-032` shows it
3-deep (`type ... { Employee(...) }` braces also count) → 3 logic nodes.

- **Assessment:** native-parser bug — same family as 2a (a sub-construct
  that belongs *inside* the logic body is being emitted as a top-level
  sibling). The fix is adjacent to 2a: a nested `${}` inside `.InLogicEscape`
  must not produce a top-level block.
- **Cost:** ~2–3 hours, and it likely shares the fix site with 2a (both are
  "don't emit a top-level block for a construct nested in a logic body").
  If 2a and 2b are done together, treat as one ~5–8h unit.

### Sub-bucket 2c — trailing-whitespace `text` node missing (18 files)

**Pattern.** `Δlen=-1` — native has one FEWER trailing `text` node.
`liveTop = ...,text,markup,text`; `nativeTop = ...,text,markup` (missing the
final `text`). A handful drop a non-final `text` too (`phase4-for-markup-044`:
`comment,markup,text,text` → `comment,markup,text`).

**Root cause.** The files end `</program>\n` — a single trailing newline (or
inter-element whitespace) after the closing tag. The live BS emits a `text`
node for that trailing-whitespace run; the native `flushTextRun`
(`parse-markup.js:229`) either is not invoked at EOF after the final closer,
or the closer-handling consumes the run boundary such that the trailing
whitespace never opens a text run. The `phase4-for-markup-044` variant
(missing a non-final `text`) suggests the native parser also merges/drops a
whitespace-only run between two adjacent markup siblings where the live BS
keeps it.

- **Assessment:** native-parser bug — minor, low-risk: a missing/merged
  whitespace-only text node. It is a fidelity defect but a benign one
  (a whitespace-only `text` node is inert downstream). Worth fixing so the
  files flip to strict.
- **Cost:** ~2–4 hours. The fix is a `flushTextRun` call at EOF / after the
  final closer in `dispatchTopLevel`'s closer path, plus checking the
  whitespace-run handling between adjacent closers. Low risk; the
  uncertainty is whether the live BS's trailing-text rule is "always emit"
  or "emit only at EOF" — needs a quick BS read before implementing.

### Sub-bucket roll-up

| Sub-bucket | Count | Cause | Type |
|---|---:|---|---|
| 2a `<state>`-in-`${}` → top-level markup | 51 | trampoline over-recognizes state opener in logic ctx | native bug |
| 2b nested `${}` → extra top-level logic | 4 | trampoline emits nested logic-escape as top-level sibling | native bug |
| 2c trailing whitespace `text` missing | 18 | `flushTextRun` not run at EOF / merged ws run | native bug |
| (unbucketed remainder) | 4 | css-bucket files = 2a pattern with `#{}` present; counted in 2a's family | native bug |

All `DIFF-top-seq` files are **native-parser bugs**, none are deliberate
modelling choices, none are canary artifacts. The class is real signal.

**Recommendation.** Do 2a+2b as one unit (shared fix site: "a construct
nested inside a `${}` body must not emit a top-level block"). Do 2c as a
small separate unit. 2a/2b are gated *behind* the Class-1 understanding —
the `<state>` recognition story should be settled first so the markup-layer
fix is coherent with the assembler-side fix.

---

## 4. Brief notes on the other four classes

- **`DIFF-hoist-count` (44).** A hoisted-collection count disagrees, top
  kinds match. Sample diffs: `typeDecls live=1 native=0`,
  `components live=1 native=0`, `imports live=0 native=1`. Mixed causes —
  `typeDecls` shortfalls point at `type` decls the native B5 production or
  A3 `synthTypeDecl` is missing in some position (e.g. typed-attr-derived
  type decls from `state-constructor-def`); the `import live=0 native=1`
  case (`phase1-import-inside-function-007`) is a native *over*-count —
  native hoists an import the live walker scopes out. **Assessment:** mostly
  native-parser bugs (hoist-fold gaps), one possible over-count. NOT a
  canary artifact. Needs its own per-field investigation — estimate
  6–10h, scattered.

- **`GAP-mixed` (38).** Multiple divergence axes at once. Two visible
  families in the sample: (i) `hasProgramRoot live=true native=false` with
  `live-only-kinds=[logic,text]` — the `<program>` root is being swallowed
  because a preceding `${}` body parse drifted (C-style `for`, `do/while`,
  nested control flow — `phase2-for-cstyle-047` etc.); the logic-body
  best-effort parse mis-tracks braces and the `<program>` block lands inside
  the logic body. (ii) `live-only=[logic] native-only=[markup]` +
  `components` shortfall (`dashboard.scrml`) — a component-def `<state>`/
  markup confusion. **Assessment:** native-parser bugs, the more serious
  ones — a swallowed `<program>` root is a real codegen-blocking defect.
  GAP-mixed will partly *dissolve* once Class 1 + 2a/2b land (a file mixing
  state-block + top-seq causes gets reclassified once one axis closes).
  Estimate 8–12h, but expect the count to drop before it is worked.

- **`GAP-native-extra-block` (30).** Native produced a top-level `sql` /
  `error-effect` / `markup` block the live pipeline did not. Sample shows
  three sub-causes: native emits an `error-effect` block for `!{...}` inside
  an error-arm that live nests differently (`phase1-let-inside-error-arm-020`);
  native emits a top-level `sql` (`multi-step-form` — charter Q1.C
  deliberately permits SQL from top level, the BS does not — this one is a
  **deliberate divergence**, see `parse-markup.js` header D-note); and
  `hasProgramRoot native=true live=false` + `typeDecls native=2` cases that
  are native *over*-production. **Assessment:** mixed — at least one
  sub-cause (top-level SQL) is a *documented deliberate modelling choice*
  (charter Q1.C), so part of this class is arguably not a "gap" at all and
  the canary could be taught to accept it. The rest are native bugs.
  Estimate 6–10h, but triage first — the deliberate-choice files should be
  reclassified, not "fixed."

- **`DIFF-engine-in-nodes` (4).** Live emits `engine-decl` in `ast.nodes`;
  native emits it only into `machineDecls`. **Assessment:** a placement
  divergence, and a *known/documented* one (the canary header names it
  exactly). It is a deliberate-but-divergent modelling choice on the native
  side — A3 hoists engines into `machineDecls` and does not also leave a
  node in `nodes`. Either the native assembler should also retain an
  `engine-decl` in `nodes` (live parity) or the canary should accept the
  placement. Smallest class, ~1–2h, low risk. Decide parity-vs-accept first.

---

## 5. Canary-limitation assessment (top-level-only diff)

The canary's `diffFileASTs` compares the **top-level** node-kind sequence,
the six hoist counts, and `hasProgramRoot`. `nodeKindSequence` (the
recursive walk) exists in the module but `diffFileASTs` does **not** use it
— it calls `topKindSequence` only. So `EXACT` means "top-level match," not
"deep match."

**Direction of the error: the 261 is an UNDER-count of true divergence.**
A deeper recursive diff would reclassify some current `EXACT` files into the
gap ledger, because:

- The Class-1 finding shows the native assembler maps `<state>` *children*
  via `synthMarkupNode` recursively. Any `<state>` nested *inside* a
  top-level `<program>` markup (the common case — most apps wrap state in
  `<program>`) is invisible to the top-level diff: the top kind is `markup`
  ("program") in both pipelines, and the `state`-vs-`markup` divergence is
  buried in the children. Those files are currently scored `EXACT`. A
  recursive diff would surface them. The 68 `GAP-state-block` files are only
  the ones with a `<state>` at *file top level*; the true population of
  state-divergent files is substantially larger.
- Likewise the C1 deferrals D1 (`DisplayTextLiteral`→`text`) and D3 (empty
  per-node `logic.{imports,...}`) are invisible to a top-level diff when
  they occur in nested position.

So **261 / 26.1% is a floor, not a ceiling.** A recursive diff would push it
higher — plausibly meaningfully higher given how many corpus files wrap
state inside `<program>`. This does not change the *fix* sizing in §2–§3
(the fixes are node-kind-agnostic to depth — `synthStateNode` recursing
`mapBlocksToNodes` fixes nested state too), but it does mean the **canary
under-reports progress and under-reports remaining work**. Recommend a
follow-up to switch `diffFileASTs` to the recursive `nodeKindSequence` once
the top-level ledger is substantially closed — otherwise files will show
`EXACT` while still deep-diverging. Do NOT do it now: it would inflate the
ledger before the dominant top-level causes are closed and muddy the
sizing. (Per brief: not fixing the canary, just flagging it.)

---

## 6. Bottom line

### Total cost to close the ledger

| Unit | Files addressed | Cost | Notes |
|---|---|---:|---|
| C-unit: shallow `synthStateNode` (Class 1) | ~64 flip, ~4 → hoist bucket | 2–3h | clean, do first |
| C-unit: suppress `<state>`/nested-`${}` top-level emit (2a+2b) | 55 | 5–8h | shared fix site; gated behind Class-1 design |
| C-unit: trailing-whitespace `text` (2c) | 18 | 2–4h | small, low-risk |
| C-unit: `DIFF-hoist-count` triage + fix | up to 44 | 6–10h | scattered, per-field |
| C-unit: `GAP-mixed` (swallowed `<program>` + misc) | ≤38 (drops as others land) | 8–12h | partly dissolves |
| C-unit: `GAP-native-extra-block` triage | 30 | 6–10h | triage first — some are deliberate |
| C-unit: `DIFF-engine-in-nodes` parity-or-accept | 4 | 1–2h | smallest |
| Deep `synthStateNode` (transition-decl/substate) | follow-up | 4–6h | not ledger-critical |

**Rough total: ~32–49 hours** to close the catalogued top-level ledger,
~36–55h including the deep-state follow-up.

### Wave or bug-hunt?

**It decomposes into clean units — a wave, not a scattered bug-hunt — but
the wave is front-loaded and the back half is messier.**

- The **front half is clean and high-leverage.** Classes 1 + 2a + 2b + 2c
  are ~140 of the 261 files (54%) and decompose into 3 well-scoped units
  (~9–15h total) with concrete fix sites already identified down to the
  function. Two of those units share a root cause (the missing `<state>`
  production). This is a genuine, sequenceable mini-wave: Class 1 first
  (assembler-side, settles the state model), then 2a/2b (markup-layer,
  consistent with that model), then 2c (independent, any time).

- The **back half is messier.** `DIFF-hoist-count`, `GAP-mixed`, and
  `GAP-native-extra-block` (112 files) are multi-cause buckets that need
  per-file triage before they can be unit-scoped. `GAP-mixed` will partly
  dissolve as the front-half units land (files mixing two causes get
  reclassified), so its real cost is lower than 38 files implies — but you
  cannot know the residual until the front half is done. `GAP-native-extra-
  block` contains at least one *deliberate* divergence (top-level SQL,
  charter Q1.C) that should be reclassified rather than fixed.

### Honest caveats

1. **The 261 is a floor.** The canary's top-level-only diff under-counts.
   Closing the visible 261 will not produce a clean recursive-EXACT corpus;
   a follow-up recursive-diff pass will surface a second tranche. Do not
   promise "26% → 0%" — promise "close the catalogued top-level ledger,
   then re-measure with a deeper diff."
2. **The dominant two classes are one root cause.** ~119 of 261 files trace
   to the missing `<state>` node production. That is good news for sizing
   (concentrated, not scattered) but it means the headline "two dominant
   classes" is really "one dominant cause in two positions."
3. **Sequencing matters.** Class 1 must land before 2a/2b — the markup-layer
   fix for "don't emit state-in-`${}` as top-level" should be designed
   against a settled state-node model, or the two fixes will disagree.
4. **Triage the back half before estimating it firmly.** The 6–10h numbers
   for `DIFF-hoist-count` / `GAP-native-extra-block` are rougher than the
   front-half numbers — they are multi-cause and one contains
   non-bugs (deliberate divergences). Budget a ~3h triage pass before
   committing those units.
