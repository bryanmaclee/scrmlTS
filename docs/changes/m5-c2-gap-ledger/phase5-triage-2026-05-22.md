---
status: current
last-reviewed: 2026-05-22
---

# M5 C2 Gap-Ledger — Phase 5 triage

**Date:** 2026-05-22
**Scope:** read-only diagnostic. No compiler-source / test changes — one output doc.
**Subject:** the **51-file residual gap ledger** left after the S119 Phase-4
wave (units P4-1..P4-C) closed the ledger 261 → 51. This doc re-derives every
gap from a live `_triage-scan.mjs` run, root-causes each into sub-buckets, and
proposes a sequenceable Phase-5 fix-unit decomposition. Closing the 51 is the
gate to M6 (delete Acorn + the legacy block-splitter).

Scan instrument: `docs/changes/m5-c2-gap-ledger/_triage-scan.mjs` — walks the
~1000-file `.scrml` corpus through `classifyDivergence`, emits the histogram +
per-class member dumps with `detail`. Re-runnable; unmodified for this triage.

---

## 1. Residual ledger summary

Live histogram (`bun _triage-scan.mjs`, 2026-05-22, HEAD `48d816f2`):

| Class | Count | Phase-4 close said | Δ |
|---|---:|---:|---|
| `EXACT` | 920 | 863 | +57 |
| `DEFERRAL-test-block` | 18 | 15 | +3 |
| `LIVE-DEGENERATE` | 11 | 0 (new in P4-C) | +11 |
| `DIFF-top-seq` | **17** | 13 | +4 |
| `GAP-mixed` | **12** | 25 | −13 |
| `DIFF-hoist-count` | **11** | 52 | −41 |
| `DIFF-deep-seq` | **9** | 24 | −15 |
| `GAP-state-block` | **1** | 1 | — |
| `GAP-native-extra-block` | **1** | 7 | −6 |

**Strict-pass = 920 + 18 + 11 = 949 (94.9%).**
**Residual gap = 17 + 12 + 11 + 9 + 1 + 1 = 51.** Arithmetic reconciles with
the brief.

**What P4 actually did.** The big P4-2 bare-markup-statement unit closed the
bulk of `DIFF-hoist-count` (52→11) and `GAP-mixed` (25→12). P4-4's if-chain
collapse pass closed the D-ifchain bucket entirely (it does not reappear).
P4-C's `LIVE-DEGENERATE` class moved 11 ex-`GAP-native-extra-block` files into
the strict-pass column (they are canary artifacts, not gaps — see §4).
`DIFF-top-seq` *grew* (13→17): P4-2 reclassified four files into it as their
hoist axis closed but a residual trailing-`text`/seq axis remained.

**Headline finding.** The Phase-4 headline ("ONE bug across four classes") no
longer holds — the bare-markup-statement defect is largely closed. The
residual 51 is **genuinely multi-cause** and splits into five distinct
root-cause families, none dominant:

1. **`type` is a hard keyword in the native tokenizer** — it should be
   *contextual*. `const type = …`, a parameter named `type`, etc. mis-parse as
   a `type` declaration. (8 files; the largest single cause.)
2. **Bare-markup `export <markup>` / `export const Name = <markup>` pairing
   forms are not lifted** — the two pairing triggers the `liftBareBlocks`
   pass-comment explicitly says are NOT handled. (~13 files.)
3. **Markup over-recognition in interpolation / expression / void position** —
   native enters `.InMarkupTag` for `${…}` interpolations, `?{…}` SQL,
   self-closer voids, and `<#tag … />` where the live pipeline keeps `text`.
   (~13 files.)
4. **`^{…}` meta-block segmentation** — the self-host files: `await import`
   inside a file-top `^{}` is not hoisted; an `^{}` at the head of a `${}`
   body truncates the native statement loop. (~5 files.)
5. **Trailing-`text` node drop** — native drops a final whitespace `text` node
   after the last markup element. (~9 files.)

Plus two **not-a-parser-bug** call-outs (§4): `jwt.scrml` (live oracle bug,
native is correct) and `GAP-native-extra-block` `components.scrml` (a
`LIVE-DEGENERATE`-adjacent classifier miss).

---

## 2. Per-class triage

### 2.1 `DIFF-hoist-count` (11)

A hoisted-collection count disagrees; top-kind SETs match.

| File | Hoist diff | Sub-bucket |
|---|---|---|
| `stdlib/compiler/meta-checker.scrml` | `typeDecls live=0 native=2` | H1 |
| `stdlib/format/index.scrml` | `typeDecls live=0 native=2` | H1 |
| `compiler/self-host/ts.scrml` | `typeDecls live=0 native=2` | H1 |
| `stdlib/auth/jwt.scrml` | `exports live=1 native=4` | H2 (not a bug) |
| `compiler/self-host/cg.scrml` | `imports live=5 native=0` | H3 |
| `phase4-component-reactive-prop-056` | `components live=1 native=0` | H4 |
| `phase4-component-jsx-brace-ghost-057` | `components live=1 native=0` | H4 |
| `samples/gauntlet-s19-phase4/nested-comments` | `components live=3 native=0` | H4 |
| `examples/05-multi-step-form` | `components live=3 native=0` | H4 |
| `examples/12-snippets-slots` | `components live=1 native=0` | H4 |

(The scan's summary line truncates the histogram detail — `meta-checker`
reports `native=2` not `native=8`; re-derived from `detail.nativeHoist`.)

#### H1 — `typeDecls live=0 native=N`: `type` keyword is not contextual (3 files)

**Files:** `meta-checker.scrml`, `format/index.scrml`, `ts.scrml`.

**Root cause — verified.** None of these files contains a single `type`
*declaration* (`grep -nE '^\s*(export\s+)?type\b'` → zero hits in all three).
What they DO contain:
- `format/index.scrml:205` — `export function formatList(items, type, locale)`
  — `type` as a **parameter name**.
- `meta-checker.scrml:433` — `fn typeToString(type)` — `type` as a param;
  `:458` — `const type = typeRegistry.get(typeName)` — `type` as a `const`
  **binding name**.
- `ts.scrml` — `type` used as an object-literal property key / local binding.

`token.js:221` tokenizes `"type"` **unconditionally** as `TokenKind.KwType`.
In scrml `type` is a *contextual* keyword — a type-declaration lead only at
statement position; anywhere else (binding name, parameter name, object key)
it is a plain identifier, and the live Acorn-based front end treats it so.

The native failure mode: `parseBindingIdent` (`parse-expr.js`) requires
`TokenKind.Ident`, so `const type` records `E-STMT-BINDING-NAME`, returns an
empty binding, and **does not consume the `type` token**. The leftover
`type = …` re-dispatches at statement level (`parse-stmt.js:497` routes
`KwType` → `parseTypeDecl`), producing a phantom `TypeDecl`. `collectHoisted`
then hoists it. **Verified by repro:** `const type = 5` and `fn g(type)` both
yield `nativeHoist.typeDecls=2 / liveHoist.typeDecls=0` (an EXACT-shape file
otherwise). The same mechanism produces `imports`/`exports` phantoms anywhere
`type` is used as a name — H1 is a recognition-correctness bug, not a hoist
bug.

**Assessment:** native-parser bug — the tokenizer mis-classifies a contextual
keyword.
**Fix locus:** `token.js` — `type` must not be a hard `KwType`. The cleanest
fix is to lex `type` as an `Ident` carrying a contextual-keyword marker and
have `parse-stmt.js` statement dispatch (`:497`, `:2231`) recognise a
statement-position `type Ident …` lead on the identifier text, the way the
live pipeline does. `KwTypeof` is a genuine hard keyword and is unaffected.
**Cost:** ~4–6h — touches the tokenizer + two dispatch sites; needs care that
`type` as a *real* declaration still routes to `parseTypeDecl`, and a sweep of
`parse-stmt.js` `STMT_LEAD` table (`:348`).

#### H2 — `jwt.scrml` `exports live=1 native=4`: NOT a native bug (1 file)

**File:** `stdlib/auth/jwt.scrml`.

**Root cause — the LIVE pipeline is the broken side.** `jwt.scrml` has 1
`export type JwtError:enum` (line 23) + 3 `export async function`
(`signJwt`/`verifyJwt`/`decodeJwt`, lines 69/118/184). Native correctly hoists
all 4 (`nativeHoist.exports=4`). The **live pipeline hoists only 1** (the
`export type`) — the live `export` walker does not recognise
`export async function`. **Native is the correct side.** This is the exact
finding phase4 §4 flagged and it persists.

**Assessment:** **NOT a native-parser bug. Canary artifact** — the live oracle
under-counts. (The 3 `typeDecls` over-counts phase4 §2.1-H5 lumped with this
turned out to be the H1 contextual-keyword bug, a *separate* native bug — H5 is
now just `jwt.scrml`.)
**Fix locus:** the canary classifier (accept the `jwt.scrml` shape) +
out-of-scope a live `block-splitter`/`ast-builder` `export async function` bug
ticket. **No native fix.**
**Cost:** rides Unit P5-C.

#### H3 — `cg.scrml` `imports live=5 native=0`: `^{}` dynamic-import hoist (1 file)

**File:** `compiler/self-host/cg.scrml`.

**Root cause.** `cg.scrml` opens with a **file-top `^{ … }` meta-block** that
contains 5 `const X = await import("./cg-parts/section-*.js")` statements plus
2 `export const`. The deep sequences are EXACT (`markup,text,meta,text,text`
both sides) and the 2 exports match — only `imports` disagrees: live=5,
native=0. The live pipeline counts the 5 `await import(...)` calls inside the
`^{}` as `imports`; native counts 0.

Note this is the **opposite direction** from phase4's H1 finding (which said
native *over*-counts `await import` mis-typed as `Import` statements). The
difference is context: phase4-H1's over-count was `await import` inside a
`${...}` LOGIC block; here the 5 are inside a `^{...}` META block, and native
hoists 0. The native `collectHoisted` walks `LogicEscape` bodies but does not
walk a `meta` block's body for hoistable imports; the live pipeline does (or,
symmetrically, the live pipeline mis-counts dynamic-import-expressions as
imports inside `^{}`). Per the §42 absence rule and the §40 meta-block contract
this needs a SPEC check — a `^{}` meta-block import-hoist is a narrow,
load-bearing self-host question.

**Assessment:** native-parser bug OR a deliberate native/live asymmetry —
**flag for SPEC adjudication.** If `await import` is a dynamic-import
*expression* (not a static `import` statement) then NEITHER pipeline should
hoist it and the live count of 5 is the bug; if the self-host `^{}` import
shape is meant to hoist, native is the bug. Phase4 §2.1-H1 already called
`await import` "a dynamic-import expression, not an import statement" — under
that ruling **live is wrong and native is correct**, making H3 a canary
artifact like H2.
**Fix locus:** pending adjudication — either canary-classifier (if native is
correct) or `collect-hoisted.js` meta-block walk.
**Cost:** ~1–2h to adjudicate + confirm; rides Unit P5-C if native is correct.

#### H4 — `components live=N native=0`: bare-markup component-defs (5 files)

**Files:** `phase4-component-reactive-prop-056`, `phase4-component-jsx-brace-
ghost-057`, `nested-comments`, `05-multi-step-form`, `12-snippets-slots`.

**Root cause — the `const Name = <markup>` pairing form.** Each file declares
a component as `const Card = <div …>…</>` (or `export const UserBadge =
<span …>`). Two placements:
- inside `${…}` — `056`/`057`: `const Card = <div … props={…}>` directly in a
  `${}` logic block;
- at bare `<program>` top-level — `05-multi-step-form` / `nested-comments` /
  `12-snippets-slots`.

The native parser does not register these as `ComponentDef`s. `collectHoisted`
(`:237`) gates a component on `init.kind === "MarkupValue"`; the native
expression parser is yielding a different `ExprKind` for `= <markup>`, OR (for
the bare top-level cases) the `<` opener is consumed by the markup trampoline
before the declarator is ever seen — exactly the `BARE_DECL_NAME_EQ_AT_END_RE`
pairing form the `liftBareBlocks` pass-comment (`parse-markup.js:1392-1396`)
states is **NOT done**: *"a `const Name = <markup>` decl is mis-segmented
BEFORE this pass … the pairing has no native `Text`-then-`Markup` shape to
match."*

The two `056`/`057` deep sequences diverge `live=text native=logic` /
`native=markup` — the `props={…}` typed-props object adds a brace-ghost on top.

**Assessment:** native-parser bug — markup-as-value / component-def
recognition. The bare-top-level leg is the un-done `liftBareBlocks` pairing
form; the in-`${}` leg is a `MarkupValue` ExprKind gap.
**Fix locus:** `parse-expr.js` (an `= <markup>` initializer must yield a
`MarkupValue`) + `parse-markup.js` (the `BARE_DECL_NAME_EQ_AT_END_RE` /
`BARE_EXPORT_AT_END_RE` pairing pass) + `collect-hoisted.js:237` gate.
**Cost:** part of Unit P5-2 (the bare-markup pairing unit).

---

### 2.2 `GAP-mixed` (12)

Multi-axis divergences.

#### M1 — top-level test-block dropped (`live-only=[logic,test]`) (2 files)

**Files:** `test-002-with-logic`, `test-009-test-reactive`.

**Root cause.** `liveTop=[comment,comment,logic,logic,text,markup,text,test,
text]` vs `natTop=[comment,comment,text,markup]`. Two axes: (a) native
swallows the two leading `logic` blocks into a `text` (`deepDiv i=2 live=logic
native=text` — a residual bare-markup-statement miss); (b) native drops the
top-level `test` block. These files carry `DEFERRAL-test-block`-shaped content
but ALSO a `logic` divergence, so they classify `GAP-mixed` not
`DEFERRAL-test-block`. The D2 test-block deferral only fires when `test` is the
*sole* live-only kind.

**Assessment:** native-parser bug for the `logic` axis (bare-markup residual);
the `test` axis is the deliberate D2 deferral surfacing because the `logic`
miss blocks the clean `DEFERRAL-test-block` match.
**Fix locus:** `parse-markup.js` — fix the bare `logic` segmentation and the
`test` axis becomes the sole live-only kind, flipping the file into
`DEFERRAL-test-block` (strict-pass). Rides Unit P5-1.
**Cost:** rides P5-1.

#### M2 — bare reactive-decl swallowed (`live-only=[logic,text]`) (2 files)

**Files:** `phase1-reactive-debounced-004`, `phase1-reactive-throttled-005`.

**Root cause — a residual bare-markup-statement miss.** `deepDiv i=9 live=logic
native=markup`. A bare reactive declaration (`@x =` with a `debounce`/`throttle`
modifier) sitting at `<program>` top-level: live opens a `logic` block, native
keeps walking as `markup`. The P4-2 `BARE_DECL_RE` set (`parse-markup.js:1407`)
does NOT include a leading `@ident` reactive-decl form — only
`export/server/type/fn/function/let/const/import`. A bare `@x = …` reactive
decl is not lifted.

**Assessment:** native-parser bug — `BARE_DECL_RE` gap.
**Fix locus:** `parse-markup.js` `BARE_DECL_RE` — verify against the live
`ast-builder.js` `BARE_DECL_RE` whether a leading `@` reactive form is in the
oracle's set; if so, the verbatim copy has drifted. Rides Unit P5-1.
**Cost:** rides P5-1 (small — a regex term).

#### M3 — `export <channel>` not lifted (`live-only=[logic]` + `exports`) (4 files)

**Files:** `23-trucking-dispatch/channels/{customer-events,dispatch-board,
driver-events,load-events}`.

**Root cause — verified.** Every channel file is a pure-channel file whose body
is a single `export <channel name="…">…</channel>`. `deepDiv` shows `live=logic
native=text` exactly at the `export <channel …>` line — native renders
` export ` as a `text` node; live opens a `logic` block (the channel
declaration). Co-occurring `exports live=1 native=0`. This is the
`BARE_EXPORT_AT_END_RE` pairing form — an `export` keyword followed by a `<`
markup opener — which the `liftBareBlocks` comment (`:1392`) explicitly does
not handle. **Repro confirmed:** a minimal `export <channel name="ce">${…}`
file → `DIFF-hoist-count`, `deepDiv live=logic native=text`.

**Assessment:** native-parser bug — the `export <markup>` pairing form.
**Fix locus:** `parse-markup.js` — the `BARE_EXPORT_AT_END_RE` pairing pass
(same site as H4's bare component-def). Rides Unit P5-2.
**Cost:** rides P5-2.

#### M4 — `phase4-tag-mismatched-closer-007` (`live-only=[text]`) (1 file)

`liveTop=[comment,markup,text]` vs `natTop=[comment,markup]` — native drops a
trailing `text` node. The trailing-`text` defect (§2.3 T-trail). Rides Unit
P5-4.

#### M5 — self-host `${}` body truncation (`live-only=[text]` + `exports`) (3 files)

**Files:** `compiler/self-host/{bpp,bs,tab}.scrml`.

**Root cause — verified.** `deepDiv i=14/26/53 live=logic native=(end)` — the
native recursive sequence is SHORTER; native stops emitting nodes partway
(`tab.scrml`: Nlen=53 vs Llen=105 — half the body lost). Each file: a `${...}`
body that opens with an `^{ … await import(…) … }` meta-block, then a run of
`export function` declarations. `bpp.scrml exports live=4 native=0` confirms
native gave up before reaching any `export`. The native statement loop bails
when it hits the `^{}` meta-block at the head of the `${}` body — it does not
re-sync past the meta-block to continue parsing the sibling `export function`
declarations.

**Assessment:** native-parser bug — `${...}` body statement loop does not
recover after a leading `^{}` meta-block.
**Fix locus:** `parse-stmt.js` (the `${...}` body statement loop) /
`parse-file.js` — the meta-block must be consumed as one statement and the
loop continue. Same `^{}`-handling family as H3 (`cg.scrml`).
**Cost:** Unit P5-3.

---

### 2.3 `DIFF-deep-seq` (9)

Top-level clean, recursive sequence diverges.

#### D-void — empty `markup` emitted where live has whitespace `text` (4 files)

**Files:** `gauntlet-r11/rust-state-machine` (i=141), `kanban-r11` (i=134),
`recipe-book` (i=150), `gauntlet-r11-elixir-chat` (i=103).

**Root cause — verified.** At the divergence index live has a whitespace
`text` node (`"  "`); native has an empty `markup` node (`kind=markup, value=""`).
Native deep len is consistently +2 over live. Native is emitting one (or two)
phantom empty `markup` node(s) deep in the tree — a self-closing / void markup
element being parsed where the live pipeline produces inter-element
whitespace. A markup-trampoline over-emission on a specific element shape
(likely a `<.../>` self-closer or a void element in a deeply-nested position).

**Assessment:** native-parser bug — markup self-closer / void over-emission.
**Fix locus:** `parse-markup.js` — the self-closer / void-element path emits a
node where it should not (or emits an extra one). Needs a per-file isolation of
the exact element at the divergence index.
**Cost:** Unit P5-5 (with the trailing-`text` work — same `parse-markup.js`
text/void-run site).

#### D-interp — `${…}` interpolation parsed as `logic` (3 files)

**Files:** `23-trucking-dispatch/pages/{customer/profile,driver/profile,
driver/messages}`.

**Root cause — verified.** `deepDiv live=text native=logic`, EQUAL deep lengths
(186=186, 203=203, 127=127) — a single nested node's *kind* flips. The
divergent node is an inline `${@currentUser.email}` / `${@channelId}`
interpolation in markup-child position. Live keeps it as a `text` node (the
interpolation is markup content); native parses it as a `logic` node. Native
over-recognises an inline `${...}` interpolation as a logic block.

**Assessment:** native-parser bug — markup-child `${...}` interpolation
mis-classified as a logic escape.
**Fix locus:** `parse-markup.js` — an inline `${...}` in markup-child position
is interpolation content (a `text`-class node), NOT a `LogicEscape` block. The
markup-child dispatch must distinguish a *standalone* `${...}` logic block
(its own child) from an *inline* `${...}` interpolation embedded in a text run.
**Cost:** Unit P5-6 (markup-in-expression / interpolation over-recognition).

#### D-sql — `?{...}` SQL parsed as a `sql` node (1 file)

**File:** `postgres-program-driver` (i=25).

**Root cause — verified.** `deepDiv live=text native=sql`. The node before the
divergence is `?{`CREATE TABLE …`}` — a `?{...}` SQL interpolation in
markup-child position. Live keeps the result as `text`; native emits a nested
`sql` block. Same family as D-interp — native over-recognises an
expression-position interpolation as a structured block.
**Fix locus:** `parse-markup.js` — rides Unit P5-6.
**Cost:** rides P5-6.

#### D-match — `<match>` block body expanded as raw markup (1 file)

**File:** `match-002-block-form-arm-swap` (i=14, Llen=17 Nlen=33).

**Root cause — verified.** `deepDiv live=match-block native=markup`. The file
has a `<match for=Phase on=@phase>` block-form dispatcher (SPEC §18.0.1) with
`<Idle>`/`<Loading>`/`<Ready>`/`<_>` arm tags. The live pipeline produces ONE
`match-block` node; native expands the `<match>` and every arm tag into raw
`markup` siblings (Nlen 33 ≈ 2× Llen 17). The native parser has **no
match-block recognition** — it treats `<match>` and its arms as ordinary
markup. (The file also contains `<phase>: Phase = .Idle` — a typed-state-decl —
but an isolated repro of `<phase>: Phase = .Idle` inside `${}` is EXACT, so the
typed-state-decl is NOT the cause here; the `<match>` expansion is.)

**Assessment:** native-parser bug — missing `<match>` block-form recognition /
assembler pass.
**Fix locus:** `parse-markup.js` / `parse-file.js` — recognise a `<match
for=… on=…>` element and assemble a `match-block` node grouping its arm
children, mirroring the live pipeline. `body-mode.js` already knows `<match>`
as a code-bearing locus; the assembler-side grouping is missing.
**Cost:** Unit P5-7 — a genuine new assembler pass (arm detection, `<_>`
fallback association). Standalone, single-file.

---

### 2.4 `DIFF-top-seq` (17)

Top-kind SETs match, SEQUENCE differs.

#### T-trail — trailing-`text` node dropped (`Δlen=-1`) (10 files)

**Files:** `examples/{02-counter,04-live-search,06-kanban-board,10-inline-tests,
15-channel-chat,19-lin-token,20-middleware,21-navigation,25-triage-board,
27-type-derived-table}`, `tableFor-basic` (also a deep `logic/text` axis).

**Root cause — verified.** `liveTop=[…,markup,text]` vs `natTop=[…,markup]` —
native drops the final whitespace `text` node after the last top-level markup
element. Most also carry a deep `deepDiv live=logic native=text` (e.g.
`02-counter` i=6, `tableFor-basic` i=3) — a residual bare-markup-statement
miss: a `${...}` logic block at `<program>` top-level still rendered as `text`
on a specific shape (the P4-2 lift did not catch every case). So T-trail is
**two co-occurring axes** on most files: (a) a residual bare-markup `logic`
miss, (b) a genuine trailing-`text` `flushTextRun` drop.

**Assessment:** native-parser bug — `flushTextRun` drops the final
whitespace-only text run; plus a residual P5-1 bare-markup-statement axis.
**Fix locus:** `parse-markup.js` `flushTextRun` (the trailing run) + Unit P5-1
(the residual `logic` axis). Re-measure after both — a file flips to `EXACT`
only when BOTH axes close.
**Cost:** Unit P5-4 (trailing-text) + the residual logic axis rides P5-1.

#### T-extra — extra trailing `text` / `markup` emitted (`Δlen=+1`) (5 files)

**Files:** `phase3-is-in-when-guard-093` (`deepDiv i=5 live=text native=markup`),
`phase3-for-arith-iterable-090` (`deepDiv i=13 live=(end) native=text`),
`phase4-void-with-content-014`, `phase4-for-markup-044`, plus
`gauntlet-r10-bun-admin` (see T-state).

**Root cause.** Two shapes. (a) `phase3-is-in-when-guard-093`: the divergent
node is `<#tick when @s is .Active />` — a `<#tag … />` self-closing reference
element with a `when`-guard; live keeps the whole thing as a `text` node,
native parses it as a `markup` element. Same markup-over-recognition family as
D-interp/D-sql. (b) `phase3-for-arith-iterable-090` / `phase4-void-with-
content-014` / `phase4-for-markup-044`: native emits one extra trailing `text`
where live has none (a void-element / `for`-markup trailing-run split defect) —
the inverse of T-trail.

**Assessment:** native-parser bug — `<#tag/>` markup over-recognition (rides
P5-6) + a void/`for` trailing-run split defect (rides P5-4/P5-5).
**Fix locus:** `parse-markup.js` — split across P5-4 (trailing run) and P5-6
(`<#tag/>` over-recognition).
**Cost:** rides P5-4 / P5-6.

#### T-state — `gauntlet-r10-bun-admin` (1 file, `Δlen` large)

`liveTop` has 48 entries, `natTop` 17 — native stops emitting after the
top-level `state` node. `deepDiv i=34 live=state native=state-constructor-def`
— native classifies a `state` block as a `state-constructor-def` and then the
sibling-stream truncates (the comments after the state block are lost). A
state-kind discrimination bug (`stateNodeKind` stamping) compounding a
post-state sibling-stream truncation.

**Assessment:** native-parser bug — state-kind discrimination + sibling
truncation after a state block.
**Fix locus:** `parse-state-body.js` (`stateNodeKind` stamping) + the
post-state-block sibling continuation in `parse-markup.js`.
**Cost:** Unit P5-8 (state-kind discrimination), single-file.

---

### 2.5 `GAP-state-block` (1)

**File:** `samples/quiz-app.scrml`. `live-only=[state] native-only=[logic]` +
`typeDecls live=2 native=0`.

**Root cause — verified.** `quiz-app.scrml` declares `type QuizState:enum =
{…}`, `type Question:struct = {…}`, then `@quizState = …`, `@questions = […]`
— all at `<program>` top-level, **outside `${}`**. The native parser explodes
the body into 37 top-level sibling nodes (`natTop` has 37 entries:
`…,text,markup,text,comment,comment,…` repeated) where the live pipeline nests
them and produces 12 top nodes including a file-level `state`. Native is
emitting markup children as top-level siblings instead of nesting them, AND
the bare `type` decls are lost (`typeDecls native=0`). `deepDiv i=35 live=state
native=comment`.

This is a compound of the bare-markup-statement cause (the `type`/`@x` lines)
+ the bare top-level `state`-decl mis-segmentation that `liftBareBlocks`'s
`TOPLEVEL_STATE_DECL_RE` comment (`:1397-1402`) says "is the P4-1 unit's
concern." P4-1 landed but did not close this specific multi-decl `<program>`
shape — multiple consecutive bare `type` + `@` decls confuse the trampoline
into sibling explosion.

**Assessment:** native-parser bug — bare-markup-statement (multiple
consecutive top-level decls) + markup nesting.
**Fix locus:** `parse-markup.js` — the bare-decl run lift (P5-1) plus the
sibling-vs-child nesting defect on a multi-decl `<program>` body.
**Cost:** the bare-decl axis rides P5-1; ~2–3h for the nesting leg (folded
into P5-1 as the `quiz-app` sub-case).

### 2.6 `GAP-native-extra-block` (1)

**File:** `examples/22-multifile/components.scrml`. `native-only=[markup]`,
`deepDiv i=7 live=logic native=markup` (Llen=9 Nlen=18).

**Root cause — verified.** `components.scrml` is a component-only file:
`import {…}` then `export const UserBadge = <span class="badge" props={…}>…</>`
at **bare file top-level**. Live produces a `logic` node (the component-def
declaration) at i=7; native parses the `<span>` as a `markup` element and
expands it (Nlen 18 vs Llen 9). This is the **same `export const Name =
<markup>` pairing form as H4 / M3** — a bare-top-level component-def the native
trampoline consumes as markup before `liftBareBlocks` runs. It lands in
`GAP-native-extra-block` rather than `DIFF-hoist-count` only because the markup
expansion adds native-only `markup` nodes.

**Assessment:** native-parser bug — the `export const Name = <markup>` pairing
form. NOT a `LIVE-DEGENERATE` artifact (the live AST here is correct and
non-degenerate — `isLiveDegenerate` correctly does not fire).
**Fix locus:** `parse-markup.js` `BARE_EXPORT_AT_END_RE` pairing pass — rides
Unit P5-2.
**Cost:** rides P5-2.

---

## 3. Phase-5 fix-unit decomposition

Sub-buckets grouped into sequenceable fix units by shared fix site.

### Unit P5-1 — residual bare-markup-statement segmentation (`parse-markup.js`)

**Addresses:** `GAP-mixed` M1 (2) + M2 (2) + `DIFF-top-seq` T-trail logic axis
(~6 of 10) + `GAP-state-block` `quiz-app` (1) ≈ **~11 files** (overlap with
P5-4 on the T-trail files — they need both).
**Cause:** the P4-2 `liftBareBlocks` pass missed three residual shapes — a
bare leading `@ident` reactive decl (`BARE_DECL_RE` gap), a multi-decl
`<program>` body that sibling-explodes (`quiz-app`), and a top-level `${}`
logic block still rendered as `text` on a specific shape.
**Fix locus:** `parse-markup.js` — extend `BARE_DECL_RE` (verify verbatim
against the live `ast-builder.js` oracle), fix the multi-decl nesting, close
the residual `${}`-as-text shape.
**Cost:** ~4–6h.
**Gates:** none — do early; it is a P4-2 follow-on.

### Unit P5-2 — bare-markup `export`/`const` `= <markup>` pairing (`parse-markup.js` + `parse-expr.js`)

**Addresses:** `DIFF-hoist-count` H4 (5) + `GAP-mixed` M3 (4) +
`GAP-native-extra-block` `components.scrml` (1) = **10 files.**
**Cause:** the two pairing forms `liftBareBlocks` explicitly does not do —
`export <markup>` (`BARE_EXPORT_AT_END_RE`) and `const Name = <markup>` /
`export const Name = <markup>` (`BARE_DECL_NAME_EQ_AT_END_RE`). Native's
markup trampoline consumes the `<` opener before the declarator is recognised.
Also the in-`${}` `MarkupValue` ExprKind gap on `056`/`057`.
**Fix locus:** `parse-markup.js` (the two pairing-form passes) +
`parse-expr.js` (an `= <markup>` initializer must yield `MarkupValue`) +
`collect-hoisted.js:237` gate.
**Cost:** ~6–9h — the largest Phase-5 unit; it is the un-done half of P4-2.
**Gates:** after P5-1 (shared markup-child dispatch — sequence to avoid churn).

### Unit P5-3 — `^{}` meta-block statement-loop recovery (`parse-stmt.js`)

**Addresses:** `GAP-mixed` M5 (3) = **3 files** (`bpp`/`bs`/`tab`).
**Cause:** a `^{}` meta-block at the head of a `${...}` body truncates the
native statement loop — it does not re-sync past the meta-block to parse the
sibling `export function` declarations.
**Fix locus:** `parse-stmt.js` `${...}` body statement loop — consume a `^{}`
meta-block as one statement and continue.
**Cost:** ~4–6h.
**Gates:** none — independent. Same `^{}`-handling family as P5-C's H3.

### Unit P5-4 — trailing-`text` flushTextRun (`parse-markup.js`)

**Addresses:** `DIFF-top-seq` T-trail trailing axis (10) + `GAP-mixed` M4 (1) +
T-extra void/`for` split (~2) = **~13 files** (the 10 T-trail files also need
P5-1's logic axis — they flip to EXACT only when both land).
**Cause:** `flushTextRun` drops the final whitespace-only `text` run after the
last top-level markup element; a co-located void/`for` trailing-run split
defect emits an extra `text` in two files.
**Fix locus:** `parse-markup.js` `flushTextRun` / the void / `for`-markup
trailing-run handling.
**Cost:** ~3–5h.
**Gates:** none — independent. Re-measure T-trail jointly with P5-1.

### Unit P5-5 — void / self-closer markup over-emission (`parse-markup.js`)

**Addresses:** `DIFF-deep-seq` D-void (4) = **4 files.**
**Cause:** native emits a phantom empty `markup` node deep in the tree where
the live pipeline produces inter-element whitespace `text` — a self-closing /
void element over-emitted on a deeply-nested shape.
**Fix locus:** `parse-markup.js` self-closer / void-element node emission.
Needs per-file isolation of the exact element at the divergence index.
**Cost:** ~4–6h.
**Gates:** none — independent (same file as P5-4; coupled in fix site, sequence
P5-4 → P5-5 to avoid churn).

### Unit P5-6 — markup over-recognition in interpolation / expression position (`parse-markup.js`)

**Addresses:** `DIFF-deep-seq` D-interp (3) + D-sql (1) + `DIFF-top-seq`
T-extra `<#tag/>` (~1) = **~5 files.**
**Cause:** native enters markup-element / logic-escape recognition for an
*inline* `${...}` interpolation, a `?{...}` SQL interpolation, and a
`<#tag … />` reference element in markup-child position — all of which the
live pipeline keeps as `text` content.
**Fix locus:** `parse-markup.js` markup-child dispatch — distinguish a
standalone `${...}` logic block from an inline interpolation; suppress
markup-element recognition for `?{...}` and `<#tag/>` in expression/content
position.
**Cost:** ~4–6h.
**Gates:** after P5-2 (shared markup-child dispatch).

### Unit P5-7 — `<match>` block-form recognition (`parse-markup.js` + `parse-file.js`)

**Addresses:** `DIFF-deep-seq` D-match (1) = **1 file.**
**Cause:** the native parser has no `<match for=… on=…>` block-form
recognition — it expands `<match>` and its arm tags as raw markup instead of
assembling one `match-block` node.
**Fix locus:** recognise `<match>` and group its arm children into a
`match-block` node, mirroring the live pipeline (`body-mode.js` already knows
`<match>` as a code locus; the assembler grouping is missing).
**Cost:** ~5–8h — a genuine new assembler pass (arm detection, `<_>` fallback).
**Gates:** none — assembler-side, independent. Single-file payoff but the same
pass closes a known SPEC §18.0.1 feature gap.

### Unit P5-8 — `gauntlet-r10-bun-admin` state-kind discrimination (`parse-state-body.js`)

**Addresses:** `DIFF-top-seq` T-state (1) = **1 file.**
**Cause:** native classifies a `state` block as `state-constructor-def` and
then truncates the post-state sibling stream (48 live top-nodes → 17 native).
**Fix locus:** `parse-state-body.js` `stateNodeKind` stamping + the
post-state-block sibling continuation.
**Cost:** ~2–4h.
**Gates:** none — independent.

### Unit P5-C — canary-classifier changes (NOT parser fixes)

**Addresses:** `DIFF-hoist-count` H2 `jwt.scrml` (1) + H3 `cg.scrml` (1,
pending SPEC adjudication).
**Two classifier items:**
1. **`jwt.scrml`** — native correctly hoists `export async function`; the live
   oracle drops it. Teach the canary to accept this shape (or note it as a
   live-side bug). File a live `ast-builder` / `block-splitter`
   `export async function`-hoist bug ticket — out of Phase-5 parser scope.
2. **`cg.scrml`** — adjudicate the `^{}` `await import` hoist against SPEC §40
   / §42. Under phase4 §2.1-H1's ruling ("`await import` is a dynamic-import
   *expression*, not an import statement"), **live's count of 5 is the bug and
   native's 0 is correct** → canary-classifier change, no native fix. If the
   self-host `^{}` import shape is meant to hoist, reassign to `collect-
   hoisted.js`.
**Cost:** ~2–3h (incl. the `cg.scrml` adjudication).
**Gates:** none. **No parser source touched** (pending the `cg.scrml` ruling).

### Sequencing & total

| Unit | Fix-locus | Files | Cost | Sequencing | Kind |
|---|---|---:|---:|---|---|
| P5-1 residual bare-markup-statement | `parse-markup.js` | ~11 | 4–6h | do early | parser fix |
| P5-2 bare `= <markup>` pairing forms | `parse-markup.js` + `parse-expr.js` | 10 | 6–9h | after P5-1 | parser fix |
| P5-3 `^{}` meta-block loop recovery | `parse-stmt.js` | 3 | 4–6h | — (parallel) | parser fix |
| P5-4 trailing-`text` flushTextRun | `parse-markup.js` | ~13 | 3–5h | — (parallel) | parser fix |
| P5-5 void / self-closer over-emission | `parse-markup.js` | 4 | 4–6h | after P5-4 (shared site) | parser fix |
| P5-6 markup-in-expr over-recognition | `parse-markup.js` | ~5 | 4–6h | after P5-2 (shared site) | parser fix |
| P5-7 `<match>` block-form recognition | `parse-markup.js` + `parse-file.js` | 1 | 5–8h | — (parallel) | parser fix |
| P5-8 `r10-bun-admin` state-kind | `parse-state-body.js` | 1 | 2–4h | — (parallel) | parser fix |
| P5-C canary-classifier | canary | 2 | 2–3h | — (last) | classifier |

**Bottom-line total: ~34–53 hours.** Parser-fix units P5-1..P5-8 = ~32–50h;
canary-classifier P5-C = ~2–3h.

**Recommended order:** P5-1 (residual bare-markup, do first — gates P5-2/P5-6)
→ P5-2 (the big un-done pairing-form unit) → P5-6 (shares the markup-child
dispatch with P5-2). P5-3, P5-4, P5-7, P5-8 run in **parallel** with that spine
— none gate it; P5-5 follows P5-4 (same `parse-markup.js` text/void site).
P5-C any time, ideally last so the re-measure reflects all parser fixes.

**File-count note:** the unit file-counts sum to >51 because several files
carry two axes (every T-trail file needs BOTH P5-1's logic axis and P5-4's
trailing-text axis; it flips to EXACT only when both land). Distinct gap files
addressed = 51 minus the 2 not-a-parser-bug files (§4) = **49 native-parser
fixes across P5-1..P5-8.**

---

## 4. Not-a-parser-bug call-outs

Of the 51 gap files, **2 are not native-parser bugs**:

- **`stdlib/auth/jwt.scrml` (`DIFF-hoist-count` H2) — live-pipeline bug.**
  Native correctly hoists all 4 exports (1 `export type` + 3
  `export async function`); the live oracle hoists only 1 — its `export`
  walker does not recognise `export async function`. **Native is the correct
  side.** Fix is a canary-classifier change + an out-of-scope live-pipeline
  bug ticket; do NOT "fix" native. (This is the persisting phase4 §4 H5
  finding — narrowed: the 3 `typeDecls` over-counts phase4 lumped here are in
  fact the H1 contextual-`type`-keyword native bug, a *separate, real* native
  bug.)

- **`compiler/self-host/cg.scrml` (`DIFF-hoist-count` H3) — pending SPEC
  adjudication; most likely a live-pipeline bug.** 5 `await import(...)` calls
  inside a file-top `^{}` meta-block: live counts them as `imports`, native
  counts 0. Under phase4 §2.1-H1's explicit ruling that `await import` is a
  dynamic-import *expression* and not an `import` statement, **the live count
  of 5 is the bug and native's 0 is correct.** Confirm against SPEC §40
  (meta-block) / §42; if the ruling holds, this is a canary artifact, not a
  native fix.

**No `LIVE-DEGENERATE` gap files remain** — P4-C's `LIVE-DEGENERATE` class
already moved all 11 degenerate-live-AST files into the strict-pass column.
`examples/22-multifile/components.scrml` is NOT a `LIVE-DEGENERATE` artifact
(its live AST is correct and non-degenerate) — it is a genuine native bug (the
`export const Name = <markup>` pairing form, Unit P5-2).

**No corpus-stale (invalid-syntax) files were found among the 51.** Every gap
file uses valid current scrml; `format/index.scrml` and `ts.scrml` carry
*downstream* corpus issues (`Intl` undeclared, `!= null`) but those are
SemA-stage errors, not parser-front-end syntax — they do not affect the
structural FileAST divergence the canary measures, and they are not parser
bugs. They are out of scope for this gap-ledger.

---

## 5. Classes that dissolve as a unit lands

- **Unit P5-2 (bare `= <markup>` pairing)** closes `DIFF-hoist-count` H4 (5),
  `GAP-mixed` M3 (4), and the lone `GAP-native-extra-block` file — `GAP-native-
  extra-block` drops to **0**. Re-run `_triage-scan.mjs` immediately after.
- **Unit P5-1 + P5-4 are coupled on the T-trail files** — the 10 `DIFF-top-seq`
  T-trail files each carry a residual `logic`-axis (P5-1) AND a trailing-`text`
  axis (P5-4); a file flips to `EXACT` only when BOTH land. Do not score
  `DIFF-top-seq` residual until both are in and the corpus is re-measured.
- **Unit P5-1 dissolves `GAP-state-block`** (`quiz-app` is the only member —
  the class drops to 0) and the M1 `logic` axis (flipping `test-002`/`test-009`
  into `DEFERRAL-test-block`, a strict-pass class).

---

## 6. Honest caveats

1. **The Phase-4 "one bug" headline is gone.** P4-2 closed the dominant
   bare-markup-statement cause. The residual 51 is genuinely five-cause; no
   single unit closes more than ~13 files. Sizing is therefore less
   concentrated and more uncertain than Phase-4's was.

2. **P5-2 is the riskiest unit** — it is the explicitly-un-done half of P4-2
   (the `liftBareBlocks` pass-comment names both pairing forms as out of
   scope). It changes core markup-child segmentation; budget the 9h end and
   expect a re-measurement tranche.

3. **The H1 `type`-keyword bug is wider than its 3-file gap count.** `type`
   being a hard tokenizer keyword corrupts ANY file using `type` as a name —
   the 3 gap files are only where it produced a *measurable hoist-count*
   divergence. Other files may carry a `type`-as-name pattern that happens not
   to shift a hoist count today; P5-1's tokenizer fix is correctness-bearing
   beyond the visible 3.

4. **`DIFF-top-seq` grew (13→17)** — P4-2 reclassified four files into it as
   their hoist axis closed. The two-axis T-trail files (P5-1 + P5-4 both
   required) mean the class will not visibly shrink until both units land.

5. **The canary oracle is still not infallible.** `jwt.scrml` (live drops
   `export async function`) and `cg.scrml` (live mis-counts `^{}` `await
   import`) are cases where the live pipeline — the assumed ground truth — is
   the defective side. Phase-5 dispatches must not reflexively "fix native" on
   those two; route them through P5-C, and file the separate live-pipeline bug
   ticket out of Phase-5 parser scope.

6. **51 remains a floor.** The deep axis under-reports — closing these 51 will
   surface a further recursive-diff tranche. Promise "close the catalogued 51,
   then re-measure," not "51 → 0." In particular P5-2's core-segmentation
   change is the most likely to expose a fresh tranche.
