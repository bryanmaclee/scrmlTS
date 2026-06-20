# scrml — Session 210 (OPEN)

**Date:** 2026-06-20. **This session:** S210. **Prev:** S209-CLOSE → `handOffs/hand-off-214.md`. **Profile:** A — FULL (booted "read pa.md and start session", no signal → default A). **Deputy:** present (`deputy-maint` merged, `^main==0`) but maps 21 behind + digest STALE → likely not actively ticking; fresh deputy boot likely owed.

> **Thinned hand-off (S205).** Mechanical state → `bun scripts/state.ts` + digest (STALE this boot) · `delta-log.md` [S209 1-31] · `deputy-state.md`/`cpa-state.md`. This carries the IRREDUCIBLE + the OPEN intake.

## Boot state (S210 OPEN)
- scrml + scrml-support both **0/0 with origin** (clean cross-machine). HEAD `41422726` (Merge deputy-maint — S209 wrap).
- Board **HIGH 0** · MED 11 · LOW 17 · Nominal 8. Tests **17350 pass / 76 skip / 0 fail** (pre-commit subset) @ v0.7.0.
- Digest STALE (delta-log changed since stamp `c2f8f1fd`) → booted via authoritative fallback (master-list §0 + hand-off + delta-log tail). Expert reads cold (pa.md full + PRIMER + SPEC-INDEX).
- **Working-tree (uncommitted, pre-session):** `M handOffs/cpa-state.md` (cPA S209 heartbeat, tick 2 19:16) · `?? docs/graph/` (flograph projection output graph.json+mmd, Jun 17). Neither is PA work; disposition TBD.
- **Worktrees:** main · `../scrml-deputy-maint` (deputy, KEEP) · `../scrml-spa-ss4` (spa/ss4, RUNNING) · `../scrml-spa-ss13` (spa/ss13, list-complete — disposition in inbox) · **`.claude/worktrees/agent-a4e244bf6be547466` (LOCKED, STALE — cleanup candidate; verify landed before removal).**

## ⚠️ S210 STATUS — 2 of 3 HIGH landed; AE re-direct pending

3 HIGH bugs triaged (CONFIRMED on `41422726`, filed `known-gaps §S210`) + dispatched.

- **AD+regex** (`codegen-interp-literal`, agent ac894d93280bac7c8) — **LANDED `14fb0230`** (S67 file-delta; PA-independent R26 green). Bug 1 root was the shared `code-segments.ts` fence (locus-corrected from brief); Bug 2 was TWO roots (regex `expression-parser.ts` + string `ast-builder.js collectBracedBody`). +unlocked an S96 locked test. Both gaps RESOLVED.
- **ss4** (block-splitter-native-parser, sPA) — **LANDED `f65b1de9`** (`git merge --no-ff spa/ss4`; clean 3-way; ast-builder.js carries both ss4 + AD+regex). 4 fixes incl. the COMPOUND_OPS latent-silent-drop closer. master-list A2 currency applied; `g-blocksplitter-comment-span-not-opaque` RESOLVED. **item6 native-parser M2-M6 PARKED→escalate** (standing ~v0.8 default-flip decision; buckets: MISSING-FIELD ~296 dominant · engine-statechild ~116 · etc).
- **AE** (`engine-name-attr-reject`, agent acf01716d7d465ba0, branch tip d909c9d8) — ⚠️ **DO NOT LAND the reject work.** Ruling (a) was WRONG (my Rule-4 miss): `<engine name=>` is RATIFIED-CANONICAL per §51 P1 prose (DD1 2026-04-30, SPEC line 27176 "Both `<engine name=N for=T>` and `<machine name=N for=T>` produce identical AST"; ~12 §51 worked examples; the §7495 machine-typed-cell `@x: M` form the 6nz repro uses). The agent flagged it + faithfully built (a), but (a) REVERSES P1. **User ruled (b): honor P1, fix the codegen dual-table mismatch** (write-guard uses the engine's real table + wire `E-ENGINE-VAR-DUPLICATE` for the `name=` path) + add the missing `name=` row to §51.0.B (table currency). RE-DISPATCH as a codegen fix; discard the old AE worktree (wrong direction). Gap `g-engine-name-attr-swallows-var-duplicate` STAYS open (board HIGH 1).

## ⚠️ IN-FLIGHT TO LAND (carried from S209 — user: "next pa can land everything")

1. **sPA ss13 (phantom-codegen-nominal-stdlib)** — **REPORTED BACK** (inbox `from-spa-ss13-disposition.md`). NO-EXECUTE disposition (docs-only branch `spa/ss13` tip `04b8397c`, base `e8a5491f`; no code, no SPEC.md). 5 dispositions: (1) stdlib Phase 3 → ESCALATE (design scope; needs §40.4 fail/!{}/bun-import ruling) · (2) §23 browser overclaims → PARK (user "no amendments to published articles") · (3) §29 vanilla interop → PARK (friction-gated) · (4) §58 build story → ESCALATE/re-bucket (agrees w/ ss14 item5) · (5) **§59 value-native maps → ALREADY BUILT** (currency correction: flip SPEC §59 Nominal→Implemented; 202/202 suites pass; reconcile §0 Nominal count + SPEC-INDEX banner). Re-integration: optional FF-merge (bookkeeping only) OR read+apply directly. **List-builder feedback:** ss13 mixed already-done/ratified-deferral/design-gated under a stale "Nominal-flip green-field" banner → footprint currency-pass owed on remaining Bucket-A lists before next sPA boots.
2. **sPA ss4 (block-splitter-native-parser)** — **STILL RUNNING** (`../scrml-spa-ss4`, branch spa/ss4, tip `207064d9`). No inbox re-integration msg yet. 7th item = `derived-value-compound-mutate` (re-clustered from ss6 flag A). Re-integrate on its inbox message per the sPA protocol.
3. **External-backend DD — DONE** (`scrml-support/docs/deep-dives/external-backend-frontend-only-2026-06-20.md`, status:current). **VERDICT = run a DEBATE** (MED-HIGH): B docs-only (reuse `<request>`+`parseVariant` §41.13 — response-typing half exists; gap is request/endpoint-typing) vs C stay-full-stack vs A `<api>` primitive; judge may land D hybrid. SSR-of-external-data GAPPED (needs BFF → contradicts premise). CAVEATS: dev-polls DENIED (signal synthesized) + 2 SPEC-unverifiable claims flagged in-doc. **NEXT: surface verdict to user**; `@debate-curator` command at bottom of DD doc; consider forging openapi-codegen-expert.

**sPA re-integration protocol:** read inbox msg → S83 verify (tip==reported SHA · `git merge-base` 3-dot disjointness vs main · no leak) → `git merge --no-ff spa/ssN` (resolve SPEC.md overlap deterministically) → gap-reconcile known-gaps → `state.ts --write` → inbox→read/ → delta-log entry → worktree+branch cleanup → deputy-gate + push. User fires sPAs; PA re-integrates (sole main-committer).

## NEW INBOX INTAKE (S210 — needs triage)

- **6nz AD (HIGH)** — user fn in ATTR-value interp emits bare name → runtime ReferenceError (`class="box box-${tag()}"` → bare `tag()`; @cell + textContent-interp rewrite fine). Compile-clean-runtime-broken. Sidecar `bug-ad-attr-interp-fn-rename.scrml`. Adjacent Bug Z (rename-pass interp coverage). → likely §47 name-encoding / attr-interp rewrite.
- **6nz AE (HIGH)** — `name=` on `<engine>` breaks the transition write-guard (looks up name-keyed table not the built transitions table) + SWALLOWS the `E-ENGINE-VAR-DUPLICATE` collision diagnostic the no-name form correctly fires. Runtime `E-ENGINE-001-RT` on every legal transition. Sidecar `bug-ae-engine-name-guard.scrml`. → §51.0.C var=/auto-decl + write-guard codegen.
- **6nz AF (question)** — §36 input-state read in markup interp is render-once (no `_scrml_effect` wrapper) — non-reactive. Sidecar `question-af-input-state-markup-nonreactive.scrml`. Needs ruling: codegen-gap (wrap in effect) vs by-design (rAF→@cell bridge). → §36.
- **6nz AA (still open)** — bare tail `match` in plain `function` silently dropped (value-discard IIFE → undefined). At-minimum a "match value unused" lint. (S13 batch X/Y/Z/AB/AC re-verified FIXED.)
- **flogence regex-literal (HIGH)** — regex/string LITERAL in call-arg position mis-compiles: `s.split(/re/)` re-serializes the WHOLE enclosing expr (space-tokenized); secondary `"a-b-c"` → `a - b - c` (quotes stripped). Silent miscompile. Workaround: bind regex to `const`. → expression serializer literal-node fallback (wrong span).
- **flogence raw-route ask (DESIGN/capability)** — author-declared raw HTTP route primitive for FSP open wire (`POST /fsp` JSON-RPC + `GET /fsp/deltas` SSE). Gap = author route PATH + multi-method dispatch + raw req/resp envelope + foreign-client bearer auth. scrml has ~80% (SSE §37 + channels §38 + library mode + `?{}`). 5 OQs for PA. Executable conformance target in flogence repo. Strawman `server function handleFsp(req) route="/fsp" method="POST" raw csrf="token"`. → §12 route-inference + §37 + emit-server.ts; DD-shaped.
- **giti match-in-lift (LOW/DX)** — block `<match>` inside `${ for…lift }` mis-parses arms as components → misleading E-COMPONENT-035/020 ("cross-file component import"). Works inside `<each>`. Fix shape: support block-`<match>` in lift OR emit "use `<each>`" diagnostic.

## OPEN escalations awaiting USER (carried from S209)
- ss5 item3 `g-channel-server-keyword-auto-migrate` (Enhanced-A) — DEFERRED S189; stays unless revived.
- ss9 §20.5 SPEC examples — migrate vs carve-out (turns on whether `session`-access is a §12.2 escalation trigger).
- ss10 item7 render-gap-ingestion (registry-placement ruling); ss10 item8 L2/L3 oracle-strategy (debate-fork).
- ss9 item4 `g-tier1-ssr-prerender` (architecture/DD); ss9 item5 / flux-mmorpg (project/Bucket-B).
- ss6 b17 cases 1-3 — gated on `g-component-body-markup-parser-absent` (NEW MED, design-track).

## OTHER carry
- **giti/6nz pa.md modernization** committed LOCAL+UNPUSHED in siblings (giti `72fda7c` / 6nz `e6fc5e8`) — push from their instances or user authorizes a here-push.
- **Maps OWED** — 21 commits behind HEAD (watermark `85d9e958`); deputy-owned. ss4/ss13 in flight add more source → let deputy batch after they land (don't refresh mid-flight).
- **§20.5 + worked-example despace residual** — ss11 escalated SPEC §4 despace + corpus migration (194 SPEC openers) still owed (ss11 items 4-8 never ran — big v0.2.0 content rewrite, item6 marketing-shaped per Rule 1).
- **Stale locked worktree** `agent-a4e244bf6be547466` — verify its work landed, then 6b-clean.

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · digest-first (S203) · S88 isolation · S99/S126 path-discipline · S136 BRIEF.md · S138 R26 verify-before-claim (both directions) · S147 coherence · S164 bg-commit-race · S205 merge-before-push gate + wrap-thinning · deputy step-0 · wrap 8-step · S206 flogence + co-location axiom · S208 sPA role · S209 cPA monitor-not-launch + §2.1 deref-vs-mark.

## Tags
#session-210 #open #profile-a #board-high-0 #ss13-reported #ss4-running #external-backend-dd-verdict #6nz-AD-AE-HIGH #flogence-regex-HIGH #flogence-raw-route-ask
