# M5 C2 Gap-Ledger — Phase 4 back-half triage

**Date:** 2026-05-22
**Scope:** read-only diagnostic. No compiler-source / test changes — one output doc.
**Subject:** the 122-file residual gap ledger left after the Phase-1..3 front-half
wave (synthStateNode, segmentation 2a/2b, void-elements, no-space `<db>`/`<schema>`,
canary deep-axis). This doc triages each residual class into root-cause
sub-buckets and proposes a Phase-4 fix-unit decomposition.

Scan instrument: `docs/changes/m5-c2-gap-ledger/_triage-scan.mjs` — walks the
~900-file `.scrml` corpus through `classifyDivergence`, collects per-class
members + `detail`. Re-runnable; produces the histogram + per-class dumps this
doc is built on.

---

## 1. Residual ledger summary

Live histogram (2026-05-22, post front-half wave):

| Class | Count | Original investigation said |
|---|---:|---|
| `EXACT` | 863 | 727 (+ 12 deferral) — front half added ~124 |
| `DEFERRAL-test-block` | 15 | 12 |
| `DIFF-hoist-count` | **52** | 44 — *grew* |
| `GAP-mixed` | **25** | 38 — predicted to dissolve, *did partly* |
| `DIFF-deep-seq` | **24** | (deep axis was new — 30 state-vs-markup closed) |
| `DIFF-top-seq` | **13** | 77 — void-element + 2a/2b wave closed 64 |
| `GAP-native-extra-block` | **7** | 30 |
| `GAP-state-block` | **1** | 68 — synthStateNode closed 67 |

Residual gap ledger = 52+25+24+13+7+1 = **122**. Arithmetic reconciles with the
brief. The front-half wave closed 261 → 122 (139 files).

**Two corrections to the original §4 brief-notes up front:**

1. `DIFF-hoist-count` **grew** (44 → 52), it did not shrink. The front-half
   wave reclassified ~8 files *into* it (state-block files carrying a
   co-occurring `typeDecls` shortfall flipped sideways exactly as the original
   §2 caveat predicted — but the count went up, not the headline-implied down).
2. `DIFF-top-seq` is **NOT void-element-shaped**. The deepen-canary report's
   "~8 deep-void" estimate is wrong. 10 of the 13 are a trailing-`text`-node
   defect (`Δlen=-1`) co-occurring with a deep `live=logic native=text`
   divergence — i.e. the **bare-statement-in-markup** root cause, not voids.
   Exactly 1 file (`phase4-void-with-content-014`) is void-shaped.

**Headline finding.** The back half is dominated by ONE root cause appearing
across four classes: **the native markup parser does not recognise bare
statement-shaped content (`type`, `export`, reactive `@x=`, `if/else`
attribute chains) sitting directly inside a markup element — it renders it as a
`text` node where the live pipeline produces a `logic` / `if-chain` / hoisted
declaration.** The recurring canary signature is `deepDiv ... live=logic
native=text` (or `live=if-chain native=markup`). It accounts for the bulk of
`DIFF-hoist-count`, `GAP-mixed`, `DIFF-deep-seq`, and `DIFF-top-seq`. Call this
**the bare-markup-statement cause** throughout.

Second finding: **`GAP-native-extra-block` (all 7) is not a native bug.** The
live pipeline silently produces a degenerate comment+text-only AST for those
files (no errors); the native parser is correct. These are canary artifacts —
the oracle is the broken side.

---

## 2. Per-class triage

### 2.1 `DIFF-hoist-count` (52) — dig hardest

A hoisted-collection count disagrees; top-kind SETs match. By (field, direction):

| Sub-pattern | Count | Direction |
|---|---:|---|
| `imports live=0 native=N` | 22 | native **over**-counts |
| `typeDecls live=N native=0` | 19 | native **under**-counts |
| `exports live=N native=1` (cards) | 6 | native **under**-counts |
| `components live=N native=0` | 4 | native **under**-counts |
| `typeDecls live=0 native=N` | 3 | native **over**-counts |
| `exports live=1 native=4` (jwt) | 1 | native **over**-counts |

(Several files carry two sub-diffs — counts above are by leading field; total
distinct files = 52.)

#### Sub-bucket H1 — `imports live=0 native=N`: import over-count (22 files)

**Files:** all of `compiler/self-host/*.scrml` + `stdlib/compiler/*.scrml`
(`bpp,bs,ce,cg,dg,expr,mc,me,mod,pa,ri,tab,ts,ast,index,module-resolver,
meta-checker`), `phase1-import-inside-function-007`.

**Root cause — two co-occurring causes, both native over-count:**
- **Dynamic `await import(...)` inside `^{...}`** — e.g. `module-resolver.scrml`
  has `const { resolve } = await import("path")` inside a meta-block. That is a
  dynamic-import *expression*, not an `import` *statement*. The native parser
  produces a `StmtKind.Import` for it; `collectHoisted.walkStmts` then hoists
  it. The live pipeline correctly does not (it is not a file-level static
  import). `index.scrml native=14` is the same cause ×14.
- **`import` inside a function body** (`phase1-import-inside-function-007`):
  `collect-hoisted.js:163-166,201-205` — `walkStmts` *deliberately recurses
  `FunctionDecl` bodies* (header: "a nested `import` inside a function body is
  still hoisted"). But this is an **E-IMPORT-003 error** in scrml — an import
  inside a function body is illegal, NOT hoisted. The live walker does not
  hoist it. The A3 comment's "live `walkBodyNodes` recursion" claim is wrong
  for imports.

**Assessment:** native-parser bug — `collect-hoisted.js` over-hoists.
**Fix locus:** `collect-hoisted.js` `walkStmts`. (a) Do not classify
`await import(...)` as `StmtKind.Import` — that belongs to the expression
grammar, not the statement grammar; the misclassification may be upstream in
`parse-stmt.js`. (b) Do not hoist `Import` statements discovered inside a
`FunctionDecl` / `Block` recursion — only top-level-of-`${}` imports hoist.
**Cost:** ~4–6h. (a) needs a check of where `await import` is tokenised; if it
is already an expression and only `collectHoisted` is wrong, lower end.

#### Sub-bucket H2 — `typeDecls live=N native=0`: type-decl under-count (19 files)

**Files:** the `gauntlet-s20-meta/meta-*` set, `meta-compile-time-pure-001`,
`meta-012-reflect-callback-param`, `engine-013/014-payload-binding-*`,
`examples/{05,06,07,11,12,14,21,25}`, `nested-comments` (as components).

**Root cause — the bare-markup-statement cause.** The `type` declarations are
written at the **top level of `<program>` markup, outside any `${...}`** — e.g.
`meta-reflect-hybrid-002.scrml`:
```
<program>
type User:struct = { ... }
type Admin:struct = { ... }
${ ... }
```
The live pipeline parses bare `type ...` lines directly inside markup as a
`logic` node (verified: live program-children = `logic,logic,text,markup,text`)
and `collectHoisted` then finds the type decls. The native markup parser
swallows the `type` lines into a single merged `text` child (native
program-children = `text,logic,text,markup,text`) — so `collectHoisted` never
sees them. This is why every H2 file also shows `deepDiv i=4 live=logic
native=text`. **Same root cause as the `DIFF-deep-seq` / `GAP-mixed`
bare-statement buckets.**

**Assessment:** native-parser bug — markup-layer; bare statement content inside
a markup element is not segmented into a logic block.
**Fix locus:** `parse-markup.js` — the markup-children dispatch needs to
recognise statement-shaped content (a line starting with a scrml keyword:
`type`, `export`, `import`, `fn`, `@ident =`, …) inside a markup element and
open a LogicEscape-equivalent block, mirroring the live BS. This is the same
fix site as `DIFF-deep-seq` bucket D-bare and `GAP-mixed` bucket M2.
**Cost:** part of a shared markup-statement unit — see §3 Unit P4-2.

#### Sub-bucket H3 — `exports live=N native=1`: export under-count (6 files)

**Files:** `examples/23-trucking-dispatch/components/{customer,driver,invoice,
load,status-picker,load-status-badge}-card.scrml`.

**Root cause.** Each card is a `${...}` block with 3–4 `export fn` declarations
plus one `export const Xxx = <markup>`. Native hoists only **1** export
(`customer-card`: native exports=1, all `FunctionDecl`; live=4). Native is
dropping the 2nd+ `export fn` and the `export const`. Likely a `parse-stmt.js`
defect — after the first `export fn`, statement-boundary detection inside the
`${}` body loses sync (the corpus scan also shows live-pipeline
`statement boundary not detected` warnings on these files — the bodies are
boundary-fragile). Native's `Export` parsing or the `${}` body statement loop
stops early.

**Assessment:** native-parser bug — statement-loop / export parsing.
**Fix locus:** `parse-stmt.js` (export-statement parse + statement-boundary
recovery inside a `${}` body). Needs a focused repro — messier than it looks
because the live pipeline ALSO mis-handles these bodies (its own warnings).
**Cost:** ~4–6h, **uncertainty flagged** — the body-fragility means the bug may
be in statement-boundary recovery, not export parsing per se.

#### Sub-bucket H4 — `components live=N native=0`: component under-count (4 files)

**Files:** `phase4-component-jsx-brace-ghost-057`, `phase4-component-reactive-
prop-056`, `nested-comments` (components=3), `examples/12-snippets-slots`
(components=1, co-occurring typeDecls). `05-multi-step-form` also (components=3).

**Root cause.** `const Upper = <markup>` component definitions the native
`collectComponentDefs` is not finding. Two possible legs: (a) the `const` is
inside bare markup (the H2 cause — it never reaches `walkStmts` as a VarDecl);
(b) the markup initializer is not landing as `init.kind === "MarkupValue"`
(`collect-hoisted.js:237` gate) — a reactive-prop / brace-ghost variant where
the native expression parser yields a different ExprKind.

**Assessment:** native-parser bug — partly the H2 bare-markup cause, partly a
`MarkupValue` recognition gap.
**Fix locus:** split — bare-markup `const` is fixed by Unit P4-2; the
`MarkupValue`-gate miss is `parse-markup.js` markup-as-value recognition +
`collect-hoisted.js:237`.
**Cost:** ~3–4h for the `MarkupValue`-gate leg; the bare-markup leg rides P4-2.

#### Sub-bucket H5 — `typeDecls/exports live<native`: native over-count (4 files)

**Files:** `stdlib/auth/jwt.scrml` (`exports live=1 native=4`),
`stdlib/format/index.scrml` (`typeDecls live=0 native=2`),
`stdlib/compiler/index.scrml`, `compiler/self-host/meta-checker.scrml`
(`typeDecls native=8`), `ts.scrml` (`typeDecls native=5`).

**Root cause — partly a LIVE-pipeline bug.** `jwt.scrml`: 1 `export type` +
3 `export async function`. Native correctly hoists all 4. The **live pipeline
drops the 3 `export async function`** (live exports=1, only the type) — the
live `export` walker does not recognise `export async function`. Here **native
is correct and the live oracle is wrong.** The `typeDecls native=8/5/2` cases
need a per-file check but are likely the same shape (native hoisting type
decls the live walker scopes out, or live under-counting).

**Assessment:** mixed — at least `jwt.scrml` is a **live-pipeline bug** →
canary artifact (native is right). The `typeDecls` over-counts need a quick
per-file confirm but are likely the same.
**Fix locus:** not the native parser. Canary-classifier note + (out of scope)
a live-pipeline `export async function` bug ticket.
**Cost:** ~1h to confirm all 4 and write them up as artifacts; **no native
fix**.

---

### 2.2 `GAP-mixed` (25) — re-measured

Predicted to "partly dissolve." It did: 38 → 25. But it did **not** become
single-axis — it is still genuinely multi-axis. Today's combinations:

#### M1 — `native-only=[state]`: over-emitted top-level state (4 files)

**Files:** `blog-cms`, `dashboard-parallel`, `debate-async-dashboard-svelte`,
`dashboard`.

**Root cause — a regression introduced by the front-half synthStateNode unit.**
Native now emits a top-level `state` node (deep len explodes: blog-cms
Nlen=297 vs Llen=29) that the live pipeline does not. The synthStateNode fix
is now firing on a block the live pipeline does NOT treat as a state block.
`isStateBlock` is over-matching — likely a `< Ident>` opener inside a comment
heavy region or a markup-as-value context being mis-recognised as a
state-constructor.

**Assessment:** native-parser bug — **front-half regression**, recognition
over-reach. Higher priority than its count suggests (a 297-vs-29 deep blow-up
is a real codegen-blocker).
**Fix locus:** `parse-state-body.js` `isStateBlock` / the `parse-markup.js`
state-opener recognition gate.
**Cost:** ~3–5h. Worth doing early — it is a regression.

#### M2 — `live-only=[logic]` + bare decl as text (15 files)

**Files:** `phase1-export-outside-logic-009`, `phase1-reactive-debounced-004`,
`phase1-reactive-throttled-005`, `modern-002-projection`, `modern-003-full-app`,
`state-009-enum-in-state`, `state-010-struct-state-combo`, `test-002/008/009`,
`22-multifile/{components,types}`, `23-trucking-dispatch/channels/{customer-
events,dispatch-board,driver-events,load-events}`.

**Root cause — the bare-markup-statement cause.** Recurring `deepDiv i=2
live=logic native=text`. Bare `export` / `type` / reactive `@x=` declarations
sitting directly inside markup (or directly under `<program>`) — native
renders `text`, live renders `logic`. Carries co-occurring hoist shortfalls
(`exports live=1 native=0`, `typeDecls live=N native=0`) for exactly the same
reason — the unhoisted decls live in the swallowed text. **Same fix as H2 /
D-bare.** The `test-*` files additionally carry the D2 test-block deferral.

**Assessment:** native-parser bug — markup-layer; will collapse into the shared
markup-statement unit.
**Fix locus:** `parse-markup.js` (shared with H2 / D-bare).
**Cost:** rides Unit P4-2.

#### M3 — self-host body truncation (3 files)

**Files:** `compiler/self-host/{bpp,bs,tab}.scrml`. `deepDiv ... live=logic
native=(end)` — native's recursive sequence is SHORTER; native stops emitting
nodes partway. `tab.scrml`: Nlen=53 vs Llen=105.

**Root cause.** Native truncates a large `${...}` body — the statement loop
bails before the end of a long body. Same family as H3 (export-count drop) —
statement-boundary recovery failing on a long body. `bpp.scrml` `exports
live=4 native=0` confirms: native produced zero exports → it gave up early.

**Assessment:** native-parser bug — statement-loop termination on long bodies.
**Fix locus:** `parse-stmt.js` statement loop / boundary recovery — **shared
with H3.**
**Cost:** rides Unit P4-4 (with H3).

#### M4 — `phase2-for-lift-outside-logic-109`, `phase4-tag-mismatched-closer-007` (2 files)

`live-only=[text]` — a trailing/inter-element `text` node native drops. The
residual trailing-`text` defect (same as DIFF-top-seq T1 below).
**Fix locus:** `parse-markup.js` `flushTextRun`. Rides Unit P4-3.

#### M5 — `examples/22-multifile/components.scrml`, `types.scrml` (counted in M2)

`live-only=[logic] native-only=[markup/text]` + hoist shortfalls — the M2
bare-statement cause with a markup mis-segmentation on top. Rides P4-2.

---

### 2.3 `DIFF-deep-seq` (24)

Top-level clean, recursive sequence diverges. Sub-buckets:

#### D-ifchain — `live=if-chain native=markup` (10 files)

**Files:** `phase2-else-attr-double-020`, `phase2-if-else-attr-chain-017`,
`phase4-if-attr-else-043`, `rust-state-machine`, `gauntlet-r11-elixir-chat`,
`gauntlet-r11-task-dashboard`, `kanban-r11`, `recipe-book`, plus 2 more.

**Root cause.** `if=` / `else` / `else if=` **attribute-conditional chains on
markup elements** (verified `phase4-if-attr-else-043`: three `<span>`s with
`if=`/`else if=`/`else`). The live pipeline runs `collapseIfChains`
(`ast-builder.js:11673`) — a post-pass that groups consecutive
conditional-attributed siblings into one `if-chain` node. The native assembler
has **no equivalent pass** — it emits each `<span>` as a raw `markup` sibling
(native deep len consistently > live: 18 vs 13).

**Assessment:** native-parser bug — missing assembler post-pass.
**Fix locus:** `parse-file.js` — add an `if-chain` collapse pass over markup
children in `mapBlocksToNodes`, mirroring `collapseIfChains`. The conditional
attributes are already parsed (they are markup attrs); only the *grouping* is
missing.
**Cost:** ~5–8h — it is a real new assembler pass (chain detection, `else`/`else
if` association, error cases for orphan `else`).

#### D-matchexpr — `live=text native=markup` (7 files)

**Files:** `phase2-match-in-markup-direct-040`, `phase4-jsx-logical-and-ghost-073`,
`channel-basic-001`, `channel-multiple-001`, `err-type-026-match-in-markup`,
`sql-all-001`, `reactive-encoded-001`.

**Root cause.** Inline expression constructs in markup-child position —
`match{}` directly in markup, `&&`-logical-and JSX-ghost expressions, channel
interpolations — that the live pipeline keeps as a `text` node (the expression
is interpolation content) but native expands into `markup` child nodes.
Native over-recognises markup inside an interpolation/expression position.

**Assessment:** native-parser bug — markup over-recognition in expression
position.
**Fix locus:** `parse-markup.js` — the markup-child dispatch must not enter
`.InMarkupTag` for `<` inside an interpolation `${...}` / expression context
(adjacent to the front-half 2a `<`-suppression contract — it appears 2a's fix
did not cover the match/`&&`/channel variants).
**Cost:** ~4–6h.

#### D-flip — `live=text native=logic` / `live=logic native=text`, equal deep len (5 files)

**Files:** `23-trucking-dispatch/pages/{customer/profile,driver/messages,
driver/profile}` (`live=text native=logic`), `24-tilde-pipeline` (`live=logic
native=text`), `sql-in-for-loop-001` (`live=text native=logic`).

**Root cause.** Deep lengths are EQUAL (e.g. 203=203, 78=78) — a single nested
node's *kind* flips between `text` and `logic`. A markup-child run that one
pipeline classifies as a logic block and the other as text. Same family as the
bare-markup-statement cause but in nested (not top-`<program>`) position; the
`~` (tilde-pipeline) and `sql-in-for-loop` cases suggest a specific construct
(`~`-decl, SQL-in-loop) in markup-child position.

**Assessment:** native-parser bug — markup-child statement classification.
**Fix locus:** `parse-markup.js` — same site as H2 / M2 (bare-markup
statement). Rides Unit P4-2; the `~`/SQL variants may need a small extra
keyword in the statement-recogniser set.
**Cost:** mostly rides P4-2; +~2h for the `~`/SQL keyword variants.

#### D-misc (2 files)

- `postgres-program-driver` — `live=text native=sql`: native emits a nested
  `sql` block in a position the live pipeline keeps as text. Markup-position
  SQL over-recognition — same family as D-matchexpr. Rides P4-2/D-matchexpr.
- `rust-dev-debate-dashboard` — `live=engine-decl native=state`: native
  recognises an engine block as a `state` block (deep len 197 vs 76 — a state
  over-expansion). **Same root cause as `GAP-mixed` M1** (`isStateBlock`
  over-matching, here colliding with an engine block). Rides Unit P4-1.

**Note — the nested-test-block D2 PA-decision.** The brief flagged "1 nested
test-block (D2 in nested position)". In this scan it surfaces as
`phase4-onclick-tilde-decl-074` — `deepDiv i=9 live=test native=text`: a
`test` block nested *inside markup*. The C1 D2 deferral drops `Test` blocks
with an `I-NATIVE-BLOCK-DROPPED` info — but D2 was scoped to **top-level**
test blocks (`DEFERRAL-test-block` only matches a top-level `liveOnly=[test]`).
A test block in nested position is not covered by the deferral class and lands
in `DIFF-deep-seq`. **PA-decision item:** either (a) extend the D2 deferral to
nested test blocks (teach the canary a `DEFERRAL-test-block` can match a
nested `test`→`text`/dropped divergence), or (b) leave it as a genuine gap and
have native drop nested `test` consistently. Recommend (a) — D2 is a
deliberate, documented deferral; its nested case is the same deliberate choice.
This is a **canary-classifier change, not a parser fix.**

---

### 2.4 `DIFF-top-seq` (13)

Top-kind SETS match, SEQUENCE differs. The deepen-canary "~8 deep-void"
estimate is **wrong** — verified below.

#### T1 — trailing-`text` node missing (`Δlen=-1`) (10 files)

**Files:** `examples/{02-counter,04-live-search,10-inline-tests,15-channel-chat,
19-lin-token,20-middleware,27-type-derived-table}`, `tableFor-basic`,
`phase4-for-markup-044`, `gauntlet-r10-bun-admin`.

**Root cause.** Native has one fewer trailing `text` node — `liveTop=
[...,markup,text]` vs `natTop=[...,markup]`. **But every one also carries a
deep `deepDiv live=logic native=text`** — so this is NOT purely the cosmetic
trailing-whitespace defect the original 2c bucket described. It is the
bare-markup-statement cause: native swallows a bare statement into the markup,
which shifts the trailing-`text` boundary. `phase4-void-with-content-014` (see
T2) is the *only* genuine void-shaped file. The original "void-element
residual" framing does not hold.

**Assessment:** native-parser bug — the trailing-`text` drop is a *symptom* of
the bare-markup-statement mis-segmentation, not an independent flushTextRun
bug. Most T1 files will flip when Unit P4-2 lands.
**Fix locus:** `parse-markup.js` (rides P4-2). A residual genuine
trailing-whitespace `flushTextRun` defect may remain on a few — re-measure
after P4-2.
**Cost:** mostly rides P4-2.

#### T2 — void / segmentation (2 files)

`phase4-void-with-content-014` (`comment,comment,markup,text,text` →
`...,markup,text`) — a void element `<x>content` where the front-half
void-element fix did not split the trailing run. `phase3-is-in-when-guard-093`
(`Δlen=+1`, `deepDiv i=5 live=text native=markup`) — a `when`-guard expression
mis-expanded as markup (D-matchexpr family).
**Fix locus:** `parse-markup.js` void-element handling (P4-3) / D-matchexpr.
**Cost:** ~2h, rides P4-3.

#### T3 — `gauntlet-r10-bun-admin` deep state mismatch (1 file, also in T1)

`deepDiv i=34 live=state native=state-constructor-def` — native classifies a
`state` block as a `state-constructor-def`. State-kind discrimination bug
(`shapeStateBlock` `stateNodeKind` stamping). Same family as Unit P4-1
(`isStateBlock` / state recognition).
**Cost:** rides P4-1.

---

### 2.5 `GAP-native-extra-block` (7) — NOT a native bug

**Files:** `api-dashboard`, `gauntlet-r10-zig-buildconfig`,
`tailwind-prose-coverage`, `expense-tracker`, `gauntlet-r11-zig-buildconfig`,
`rust-dev-lin-lift-edge-cases`, `rust-dev-lin-lift-pipeline`.

**Root cause — the LIVE pipeline is the broken side.** Every file:
`native-only=[markup]`, deep len native ≫ live (e.g. `api-dashboard` Nlen=327
vs Llen=20), and the live AST is **degenerate — comment+text nodes only, no
`markup` at all, and zero errors** (verified: `expense-tracker` live = 5 nodes,
all comment/text; `gauntlet-r10-zig-buildconfig` live = 14 nodes, comment/text
only). The native parser produces the correct full markup tree. The live
block-splitter is **silently dropping all markup content** for these files.
4 of 7 have `<program db="...">`; but `gauntlet-r10-zig-buildconfig` has a
plain `<program>` and `tailwind-prose-coverage` opens with `<article>` — so it
is not purely a `db=` trigger; the live BS has a content-dropping defect that
these 7 files hit.

The original investigation's "deliberate top-level SQL (charter Q1.C)"
sub-cause is **NOT present** in today's 7 — no `sql` over-emit, no
`error-effect`. That sub-cause was closed or never re-occurred post front-half.

**Assessment:** **NOT a native-parser bug. Canary artifact — the oracle (live
pipeline) is defective.** The `classifyDivergence` contract assumes the live
FileAST is ground truth; for these 7 it is not.
**Fix locus:** the **canary classifier**, not the parser. Teach
`classifyDivergence` to detect a degenerate-live-AST condition (live produced
zero `markup` nodes while native produced a substantial tree) and classify it
`LIVE-DEGENERATE` (a new explained-but-flagged class) rather than blaming
native. Separately, file a live-pipeline `block-splitter.js` content-drop bug
(out of Phase-4 parser scope).
**Cost:** ~2–3h canary-classifier change; **no native parser fix.**

---

### 2.6 `GAP-state-block` (1)

**File:** `samples/quiz-app.scrml`. `live-only=[state] native-only=[logic]` +
`typeDecls live=2 native=0`.

**Cause.** The native parser explodes the `<program>` body into ~37 top-level
sibling nodes (`text,markup,text,comment...` repeated) where the live pipeline
nests them under the program markup and produces 12 top nodes incl. a top-level
`state`. Native is **emitting markup children as top-level siblings** instead
of nesting them — and the file-level `<state>` block + 2 `type` decls are lost
in the over-segmentation. This is a markup nesting/segmentation defect on a
specific `<program>` shape, plus the bare-markup-statement cause (`typeDecls
native=0`, `deepDiv live=logic native=text`).

**Assessment:** native-parser bug — markup nesting + bare-statement.
**Fix locus:** `parse-markup.js` markup nesting (the children-as-siblings leg
is its own defect) + P4-2 for the type-decls.
**Cost:** ~2–3h for the nesting leg; type-decls ride P4-2.

---

## 3. Phase-4 unit decomposition

Sub-buckets grouped into sequenceable fix units by shared fix site.

### Unit P4-1 — state recognition correctness (`parse-state-body.js`)

**Addresses:** `GAP-mixed` M1 (4) + `DIFF-deep-seq` D-misc engine case (1) +
`DIFF-top-seq` T3 (1) = **~6 files.**
**Cause:** `isStateBlock` over-matches — a front-half synthStateNode
**regression**. Native now emits `state` where live does not, and mis-discriminates
`state` vs `state-constructor-def` and `engine` vs `state`.
**Fix locus:** `parse-state-body.js` `isStateBlock` + `shapeStateBlock`
`stateNodeKind`; possibly the `parse-markup.js` state-opener gate.
**Cost:** ~3–5h. **Do first — it is a regression**, and it gates nothing but
should not be allowed to sit.
**Gates:** none. Independent.

### Unit P4-2 — bare-markup-statement segmentation (`parse-markup.js`)

**THE big unit — the dominant back-half cause.**
**Addresses:** `DIFF-hoist-count` H2 (19) + H4 bare-markup leg (~3) +
`GAP-mixed` M2 (15) + M5 (counted in M2) + `DIFF-deep-seq` D-flip (5) +
D-misc postgres (1) + most of `DIFF-top-seq` T1 (~8 of 10) +
`GAP-state-block` type-decl leg (1) ≈ **~50 files** (with overlap — many carry
this cause as one of several axes).
**Cause:** the native markup parser swallows bare statement-shaped content
(`type`, `export`, `import`, `fn`, reactive `@x=`, `~`-decl) sitting directly
inside a markup element into a `text` node; the live BS opens a logic block.
**Fix:** in `parse-markup.js`, the markup-children dispatch must recognise a
statement-keyword-led line inside a markup element and open a
LogicEscape-equivalent block, mirroring the live block-splitter. +~2h for the
`~`/SQL keyword variants (D-flip).
**Cost:** **~8–12h.** This is the largest, riskiest unit — it changes core
markup segmentation; budget the high end and expect deep-axis re-measurement
to surface a residual tranche.
**Gates:** should land **after** P4-1 (P4-1 settles state recognition so the
new logic-block segmentation does not collide with state-block recognition).
**Dissolves:** when P4-2 lands, ~50 ledger entries across 4 classes collapse
— re-run the scan immediately after; H2/M2/D-flip/T1 will largely vanish and
the residual of every other class shrinks.

### Unit P4-3 — markup over-recognition in expression position (`parse-markup.js`)

**Addresses:** `DIFF-deep-seq` D-matchexpr (7) + `DIFF-top-seq` T2 (2) =
**~9 files.**
**Cause:** native enters `.InMarkupTag` for `<` / constructs inside an
interpolation / expression position (`match{}` in markup, `&&`-ghost, channel
interpolation, `when`-guard) — the front-half 2a `<`-suppression did not cover
these variants.
**Fix locus:** `parse-markup.js` — extend the 2a expression-context
`<`-suppression to the match/`&&`/channel/when variants.
**Cost:** ~4–6h.
**Gates:** after P4-2 (both touch markup-child dispatch — sequence to avoid
merge churn). Independent in logic, coupled in fix site.

### Unit P4-4 — if-chain collapse assembler pass (`parse-file.js`)

**Addresses:** `DIFF-deep-seq` D-ifchain (10) = **10 files.**
**Cause:** native has no `collapseIfChains` equivalent — `if`/`else`/`else if`
attribute-conditional markup siblings are emitted ungrouped.
**Fix locus:** `parse-file.js` `mapBlocksToNodes` — add an `if-chain` collapse
post-pass mirroring `ast-builder.js:11673 collapseIfChains`.
**Cost:** ~5–8h — a genuine new assembler pass (chain detection, `else if`
association, orphan-`else` errors).
**Gates:** none — assembler-side, independent of the markup-layer units. Can
run in parallel with P4-2/P4-3.

### Unit P4-5 — statement-loop / boundary recovery (`parse-stmt.js`)

**Addresses:** `DIFF-hoist-count` H3 (6) + `GAP-mixed` M3 (3) = **~9 files.**
**Cause:** native's `${...}` body statement loop terminates early on long /
boundary-fragile bodies — drops 2nd+ `export fn`, truncates large self-host
bodies.
**Fix locus:** `parse-stmt.js` statement loop + boundary recovery.
**Cost:** ~5–8h, **uncertainty flagged** — the live pipeline ALSO mis-handles
these bodies (emits `statement boundary not detected` warnings); the repro is
fragile and the fix may be harder than the file count implies. "Messier than
it looks."
**Gates:** none. Independent.

### Unit P4-6 — collect-hoisted import over-count (`collect-hoisted.js`)

**Addresses:** `DIFF-hoist-count` H1 (22) = **22 files.**
**Cause:** `walkStmts` hoists (a) `await import(...)` dynamic-import
expressions mis-typed as `Import` statements, and (b) `import` statements
found by recursing into `FunctionDecl` bodies (illegal E-IMPORT-003 placement
— must not hoist).
**Fix locus:** `collect-hoisted.js` `walkStmts` (stop recursing imports out of
function bodies; stop hoisting dynamic-import); possibly `parse-stmt.js` if
`await import` is mis-tokenised as a statement.
**Cost:** ~4–6h.
**Gates:** none. Independent — can run in parallel; small, well-scoped.

### Unit P4-C — canary-classifier changes (NOT parser fixes)

**Addresses:** `GAP-native-extra-block` (7) + the nested-test-block D2
PA-decision + `DIFF-hoist-count` H5 (4).
**Three classifier changes:**
1. **`LIVE-DEGENERATE` class** — detect a degenerate live AST (live produced
   zero `markup` nodes while native produced a substantial tree) and classify
   `LIVE-DEGENERATE` instead of `GAP-native-extra-block`. Closes the 7
   native-extra-block files as canary artifacts. (+ file a live
   `block-splitter.js` content-drop bug, out of Phase-4 parser scope.)
2. **Extend `DEFERRAL-test-block` to nested test blocks** — the D2 deferral is
   deliberate and documented; its nested case is the same choice. PA-decision:
   recommend accept. Closes `phase4-onclick-tilde-decl-074`.
3. **H5 reclassification** — `jwt.scrml` (and the 3 `typeDecls` over-counts,
   pending confirm) are live-pipeline bugs where native is correct. Either
   teach the canary to accept them or note them as live-side bugs. ~1h confirm.
**Cost:** ~3–4h total. **No parser source touched.**
**Gates:** none.

### Sequencing & total

| Unit | Files | Cost | Gates | Notes |
|---|---:|---:|---|---|
| P4-1 state recognition | ~6 | 3–5h | — (do first) | front-half regression |
| P4-2 bare-markup-statement | ~50 | 8–12h | after P4-1 | THE big unit; dissolves 4 classes |
| P4-3 markup-in-expr over-recog | ~9 | 4–6h | after P4-2 (shared site) | |
| P4-4 if-chain collapse pass | 10 | 5–8h | — (parallel) | new assembler pass |
| P4-5 statement-loop recovery | ~9 | 5–8h | — | messier than count implies |
| P4-6 collect-hoisted import | 22 | 4–6h | — (parallel) | well-scoped |
| P4-C canary-classifier | 11 + decision | 3–4h | — | NOT a parser fix |

**Bottom-line total: ~32–49 hours.** Parser-fix units P4-1..P4-6 = ~29–45h;
canary-classifier P4-C = ~3–4h.

**Recommended order:** P4-1 (regression, first) → P4-2 (big, gates the most) →
P4-3 (shared markup site with P4-2). P4-4, P4-5, P4-6 run in **parallel** with
that spine — none gate each other. P4-C any time, ideally last so the
re-measure reflects all parser fixes.

---

## 4. Not-a-parser-bug call-outs

- **`GAP-native-extra-block` (7 files) — canary artifacts.** The live pipeline
  produces a degenerate comment+text-only AST; the native parser is correct.
  Fix is a canary-classifier change (`LIVE-DEGENERATE` class), not a parser
  fix. The original investigation's "deliberate top-level SQL (charter Q1.C)"
  sub-cause is NOT present in today's 7.
- **`DIFF-hoist-count` H5 — `jwt.scrml` (+ ~3) is a live-pipeline bug.** Native
  correctly hoists `export async function`; the live `export` walker drops it.
  Native is the correct side. Reclassify, do not "fix" native.
- **Nested test-block D2 (`phase4-onclick-tilde-decl-074`) — PA-decision.** The
  D2 test-block deferral is deliberate and documented but scoped to top-level;
  its nested case lands in `DIFF-deep-seq`. Recommend extending the
  `DEFERRAL-test-block` canary class to cover nested test blocks — a
  canary-classifier change, the same deliberate choice as top-level D2.

## 5. Classes that dissolve as a unit lands

- **Unit P4-2 (bare-markup-statement) dissolves ~50 entries across FOUR
  classes** — `DIFF-hoist-count` H2/H4, `GAP-mixed` M2/M5, `DIFF-deep-seq`
  D-flip/D-misc-postgres, most of `DIFF-top-seq` T1. After P4-2 lands, re-run
  `_triage-scan.mjs` immediately — those four classes will shrink dramatically
  and any residual must be re-bucketed (the deep-axis may surface a fresh
  tranche per the original §5 floor caveat). **Do not estimate P4-3/P4-5
  residuals firmly until P4-2 has landed and the corpus is re-measured.**
- **Unit P4-1 (state recognition)** removes the M1 over-emit and the
  D-misc/T3 state-discrimination entries — small but it is a regression so it
  must precede P4-2 (P4-2's new logic-block segmentation must not collide with
  a still-buggy state recogniser).

## 6. Honest caveats

1. **The headline back-half cause is ONE bug.** ~50 of 122 residual files
   trace to the bare-markup-statement segmentation defect (Unit P4-2). Good for
   sizing (concentrated), but P4-2 is the riskiest unit — it changes core
   markup segmentation; budget the 12h end and expect a re-measurement
   tranche.
2. **`DIFF-hoist-count` grew, it did not shrink** (44 → 52) — the original §4
   note's framing was optimistic. Front-half state-block closure reclassified
   files *into* it.
3. **The `DIFF-top-seq` "void-element residual" framing is wrong.** 10 of 13
   are the bare-markup-statement cause, not voids. Exactly 1 file is void-shaped.
4. **P4-5 is messier than its 9-file count** — the live pipeline mis-handles
   the same bodies (its own boundary warnings); the repro is fragile.
5. **The canary's oracle is not infallible.** `GAP-native-extra-block` (7) and
   `DIFF-hoist-count` H5 (≥1) are cases where the live pipeline — the assumed
   ground truth — is the defective side. Phase-4 fix dispatches must not
   reflexively "fix native" on those; the canary classifier needs the
   correction, and a separate live-`block-splitter.js` bug ticket is warranted
   (out of Phase-4 parser scope).
6. **122 remains a floor.** Per the original §5, the deep axis under-reports;
   closing these 122 will surface a further recursive-diff tranche. Promise
   "close the catalogued 122, then re-measure," not "122 → 0."
