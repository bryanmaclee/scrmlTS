# Articles currency table — 2026-05-13 (Wave 4.A D-1)

**HEAD:** `bdbf810` (S89 close-prefix).
**Author:** PA-dispatched Wave 4.A D-track agent (agent-ad5eed19b2ac280a1).
**Source authority:** current article files in `docs/articles/`, current SPEC, Wave 3.7 corpus-ouroboros audit (S89, 2026-05-13), S57 ARTICLE-TRUTHFULNESS-AUDIT (2026-05-05 — partially stale post-S84/S88/S89), S84 changelog W2-3 entry (5 articles publishable post-edit).

Per pa.md Rule 4 (derived planning docs are NOT authoritative): each article was re-read against current state before classification; pre-existing audits were used as cross-reference, not authority.

---

## §0 Disposition framework

Per task spec:

- **ACCURATE** — content matches current SPEC + binary; no action needed.
- **NEEDS-EDIT** — content has dated examples / stale API references / forbidden-but-legitimate-pedagogy contrast blocks that need clarifying.
- **RETRACT** — content describes features/approaches no longer supported; remove or archive.
- **DO-NOT-PUBLISH** — content is in-progress draft, internal-only, or speculative; not for public consumption.

Refined sub-classifications used below:
- **ACCURATE-PUBLISHED** — already published per S84 W2-3; content matches current SPEC.
- **ACCURATE-DRAFT** — frontmatter `published: false` but content is publish-ready.
- **NEEDS-EDIT-MINOR** — small currency edit needed (one line, banner update, link refresh).
- **NEEDS-EDIT-BORDERLINE** — non-mechanical edit pending user disposition (S89 audit §5 carry-forwards).
- **DO-NOT-PUBLISH-INTERNAL** — internal-only (LLM agent-brief, snippet draft, personal draft). MUST stay in `docs/articles/` if pa.md depends on it.
- **RETRACT-SUPERSEDED** — superseded by newer version; archive to `scrml-support/archive/articles-skipped/`.

---

## §1 Currency table

| # | File | Lines | Frontmatter `published:` | S57 classification | S89 audit drift findings | **D-1 disposition at HEAD `bdbf810`** | Reason |
|---|------|-------|-----|-----|-----|------|--------|
| 1 | `components-are-states-devto-2026-04-29.md` | 262 | false | ACCURATE-with-caveat | Clean (all forbidden idioms in TS "before scrml" contrast blocks — legitimate pedagogy) | **ACCURATE-DRAFT** | Has Status (v0.2.x) banner (line 14) covering preview-of-future-feature framing. Conceptual frame aligned with current SPEC §52.3 + §53. Per S84 W2-3 (commit `2646cdd`): edited + status banner; PUBLISHABLE. No edits needed at HEAD. |
| 2 | `css-without-build-step-devto-2026-04-29.md` | 199 | false | ACCURATE | Clean | **ACCURATE-DRAFT** | No forbidden-idiom drift. Native `@scope` story is current. `#{}` sigil docs match SPEC §9.1 + §25.6. Limitations (arbitrary values, responsive prefixes) honestly disclosed. No edits needed. |
| 3 | `llm-kickstarter-v0-2026-04-25.md` | 373 | (no frontmatter — internal) | INTERNAL — superseded | 2 occurrences of `return null` / `: null` in `login()` example (S89 audit §5 D-1) | **RETRACT-SUPERSEDED** | v0 explicitly superseded by v1 per S78 + pa.md line 319 ("v1 supersedes v0 — v0 had structural errors"). pa.md routes all dev briefings through v1. Move to `scrml-support/archive/articles-skipped/`. S89 audit §5 D-1 recommends exactly this. |
| 4 | `llm-kickstarter-v1-2026-04-25.md` | 731 | (no frontmatter — internal) | INTERNAL — superseded by v2 (but still in active use) | 2 `null` occurrences in `login()` example at lines 308, 311 (S89 audit §4 M-8) | **DO-NOT-PUBLISH-INTERNAL** + **NEEDS-EDIT-BORDERLINE** | Per pa.md line 319: **"Every dev dispatch that writes scrml … MUST include `docs/articles/llm-kickstarter-v1-2026-04-25.md` in the briefing."** Cannot move — pa.md depends on this exact path. The `null` drift is the canonical `login()` example mirrored in v2 (S89 §3.3 #1 names it the most consequential corpus-ouroboros vector). Per Rule 3, structural rewrite (failable-fn `!{}` form) is preferred over mechanical `null → not`. Surface to user disposition (D-4) before D-2 edits. |
| 5 | `llm-kickstarter-v2-2026-05-04.md` | 1285 | (no frontmatter — internal) | INTERNAL — explicit v0.next reference | 3 `null` occurrences: line 243 `<startTime default=null>`, lines 858, 861 (`login()` example, mirror of v1) (S89 audit §4 M-9 + M-10) | **DO-NOT-PUBLISH-INTERNAL** + **NEEDS-EDIT-BORDERLINE** | Mirror of v1 status: canonical INTERNAL agent-brief, NEVER for public. Line 243 `default=null` requires coordinated SPEC §6.4 edit per S89 audit §5 D-4 (W-3 sub-task; SPEC.md §6.4 itself still says `default=null`). login() drift mirrors v1. Surface to user disposition before edits. |
| 6 | `lsp-and-giti-advantages-devto-2026-04-28.md` | 229 | false | ACCURATE subject to giti-claim review | Clean | **ACCURATE-DRAFT** | LSP capabilities (L1-L4 features) cited match shipped reality; SQL column completion + cross-file go-to-def + code actions all match current LSP code path. Giti integration claims framed as design pieces. No drift. No edits needed. |
| 7 | `mutability-contracts-devto-2026-04-29.md` | 280 | false | NEEDS-EDIT (refinement predicates) | `(null -> T)` lifecycle syntax at lines 129-130, 232, 248, 250 (S89 audit §5 D-2 BORDERLINE) | **NEEDS-EDIT-BORDERLINE** | Already has Status (v0.2.x) banner (line 14) calling out lifecycle/typestate as "SPEC-ratified design surfaces that are not yet implemented in the v0.2.4 compiler." Per S89 §5 D-2: the `(null -> T)` syntax is preview-of-future-feature; S81 directive ("null in no context") conflicts with the example; SPEC needs reconciliation FIRST, then republish-or-leave decision per pa.md Rule 1 (published article immutability). Surface to user disposition (D-4). |
| 8 | `npm-myth-devto-2026-04-28.md` | 250 | false | ACCURATE | Clean | **ACCURATE-DRAFT** | Per S65 changelog (line 964): article amended to soften "None of it. Ever." to calibrated form with `parseVariant` discriminator-parsing answer + form-DX claim. Companion piece `scrml-debate-amends-zod-claim` carries the long-form calibration. No drift detected at HEAD. No edits needed. |
| 9 | `orm-trap-devto-2026-04-29.md` | 204 | false | ACCURATE | Clean (only `null` mentions are SQL DDL `not null` constraints) | **ACCURATE-DRAFT** | `?{}` SQL block + `<schema>` + `<db>` + `scrml migrate` all match current binary. No drift. No edits needed. |
| 10 | `realtime-and-workers-as-syntax-devto-2026-04-29.md` | 231 | false | NEEDS-EDIT (`@shared` removal) | All `try/catch`/`===`/`null` matches in TS "before scrml" contrast blocks (legitimate); KNOWN-DRIFT carry-forward `<channel protect=>` at line 209 (S89 §5 D-3); article references "v0.2.0+" as future at line 198 | **DO-NOT-PUBLISH-INTERNAL** alternative: keep `published: false` until republish decision | Per S84 W2-3 changelog: this article was edited (commit `eaf718f`) to remove `@shared` + add v0.2.0-removes-`@shared` callout (visible at line 125-126: "`@shared` modifier from older scrml drafts is gone in v0.2.0"). Currently reads coherently. The `protect=` line 209 reference is known-drift carry-forward (S89 §5 D-3 — KNOWN-DRIFT immutable per Rule 1 unless republish). The "v0.2.0+" framing at line 198 is now outdated (v0.2.6 is shipped baseline; v0.3.0 is in flight). **NEEDS-EDIT-BORDERLINE** if Rule 1 immutability lifted by user. Otherwise leave as-is. |
| 11 | `scrml-debate-amends-zod-claim-devto-2026-05-06.md` | 242 | false | (post-S57 — not in S57 audit) | Clean | **ACCURATE-DRAFT** | Per S66 was archived to `scrml-support/archive/articles-skipped/` (status: SKIPPED); subsequently re-instated to `docs/articles/` (the version here lacks the SKIPPED status flag). Article content describes the parseVariant ship + the methodology stack; matches current shipped state. Companion to npm-myth amendment. No drift. No edits needed beyond reconciling the duplicate-file inconsistency (cleanup task: remove the duplicate from `articles-skipped/` since the article was re-instated). |
| 12 | `server-boundary-disappears-devto-2026-04-28.md` | 225 | false | NEEDS-EDIT (predicate args) | All `try/catch`/`===` matches in TS "before scrml" contrast blocks (legitimate); only scrml-fenced code in the article | **ACCURATE-DRAFT** | Per S84 W2-3: edited + 5 articles publishable list includes this one. Article body now uses failable-fn `server function submitOrder(items)! -> SubmitError { ... fail SubmitError::ItemCountOutOfRange }` shape at lines 96-108 (current canonical). Predicate-arg refinement framing softened to "items: List<Item>(@length > 0 && @length < 100) style — part of §53 design surface still landing through v0.2.x" at line 127. PUBLISHABLE per S84. |
| 13 | `teej_baiting_tweet.md` | 9 | (no frontmatter) | (post-S57 — not in audit) | Clean (not scrml content) | **RETRACT-SUPERSEDED** or **DO-NOT-PUBLISH-INTERNAL** | Personal tweet draft — entirely off-topic from scrml; 9 lines about ordering coffee from terminal.shop + a Teej Hooper bait. Not an article; not for scrml.dev. Archive to `scrml-support/archive/articles-skipped/`. Per Wave 4 SCOPING §4 D-3 "tweet draft + snippet draft; internal-only by name" — same disposition. |
| 14 | `tier-ladder-promotion-devto-2026-05-04.md` | 370 | false | DO-NOT-PUBLISH until A2 lands | Clean (no S89 drift findings) | **ACCURATE-DRAFT** | S57's DO-NOT-PUBLISH gate predicated on engines NOT yet shipping. **A1c shipped engines + match-block S77-S78** (per changelog 1011 + companion deprecation article). Article has Status (v0.2.x) banner (line 14) explicitly noting: "Tier 0 + Tier 2 are shipped in v0.2.4; Tier 1 block-form `<match for=Type>` is spec-ratified but parser does not yet recognize it in v0.2.4." Per S84 W2-3: edited + publishable. S57's gate has LIFTED; article was re-classified per S84 changelog. PUBLISHABLE. |
| 15 | `why-programming-for-the-browser-needs-a-different-kind-of-language-devto-2026-04-27.md` | 84 | false | ACCURATE | Clean | **ACCURATE-DRAFT** | High-altitude six-feature overview. Already published (referenced as canonical_url across siblings). No drift. No edits needed. |
| 16 | `why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md` | 268 | false | (post-S57 — not in audit) | Clean | **ACCURATE-DRAFT** | Companion to `tier-ladder-promotion`. Describes v0.2.0 function-overloading + component-overloading deprecation. Per S64 audit + debate-02 + debate-03 (changelog 986 + 1011): article surgical edits landed; debate-ratified; companion to tier-ladder. PUBLISHABLE. |
| 17 | `x-snippet-zod-calibration-2026-05-06.md` | 102 | false | (post-S57 — not in audit) | Clean | **DO-NOT-PUBLISH-INTERNAL** | Internal X (Twitter) paste-ready snippet — not a dev.to article. `posting_strategy:` frontmatter + 3-variant catalog confirm it's a PA-only artifact for Bryan's X-posting decision. Per S65 changelog 945+965: `published: false awaiting Bryan post`. Keep in place but mark INTERNAL. |

---

## §2 Disposition counts

| Disposition | Count | Files |
|---|---|---|
| ACCURATE-DRAFT (publish-ready, no edits) | 10 | css-without-build-step, components-are-states, lsp-and-giti-advantages, npm-myth, orm-trap, scrml-debate-amends-zod, server-boundary-disappears, tier-ladder-promotion, why-programming-for-browser, why-scrml-has-to-deprecate |
| NEEDS-EDIT-BORDERLINE (pending user disposition) | 3 | llm-kickstarter-v1 (`login()` Rule 3 rewrite), llm-kickstarter-v2 (`login()` + `default=null`), mutability-contracts (`(null -> T)` lifecycle syntax) |
| DO-NOT-PUBLISH-INTERNAL (internal-only; stay in place) | 4 | llm-kickstarter-v1, llm-kickstarter-v2, x-snippet-zod-calibration (some overlap with NEEDS-EDIT-BORDERLINE above) |
| RETRACT-SUPERSEDED (archive to articles-skipped/) | 2 | llm-kickstarter-v0, teej_baiting_tweet |

Note: kickstarter v1 + v2 appear in BOTH NEEDS-EDIT-BORDERLINE AND DO-NOT-PUBLISH-INTERNAL — they remain internal regardless but have line-level drift needing user disposition.

---

## §3 Action plan for D-2 + D-3 + D-4

### D-2 (NEEDS-EDIT pass) — minimal edits only

**Per task spec: "Apply minimal edits to bring current-truth. Don't rewrite. If >30% rewrite — flag for separate dispatch."**

Per pa.md Rule 1 (published article immutability) + S89 audit §5 D-2 (mutability-contracts `(null -> T)` lifecycle syntax requires upstream SPEC reconciliation before any migration) + S89 §3.3 #1 (kickstarter `login()` Rule 3 structural rewrite preferred over mechanical — ~30-60 min/article per audit §6 sizing):

All 3 NEEDS-EDIT-BORDERLINE items require user disposition BEFORE edits land. None qualify as minimal-edit pass per Wave 4 SCOPING §4 D-2.

**D-2 outcome:** no edits applied in this dispatch. All 3 borderlines flagged in §4 below for D-4 user disposition.

### D-3 (RETRACT pass) — 2 file moves

1. `llm-kickstarter-v0-2026-04-25.md` → `scrml-support/archive/articles-skipped/llm-kickstarter-v0-2026-04-25.md` (S89 audit §5 D-1 endorses this exact disposition).
2. `teej_baiting_tweet.md` → `scrml-support/archive/articles-skipped/teej_baiting_tweet.md` (not scrml content; personal tweet draft).

Leave stub at original path with redirect notice (per task spec: "Leave a stub at the original path with redirect notice").

### D-4 (DO-NOT-PUBLISH pass) — surface to user, no moves

Per pa.md line 319 (kickstarter v1 dependency) + pa.md S82 dispatch protocol, INTERNAL items MUST NOT move from `docs/articles/`. The DO-NOT-PUBLISH status is operational, not structural.

Three items remain in place with status confirmed:
1. `llm-kickstarter-v1-2026-04-25.md` — INTERNAL (pa.md dispatch dependency).
2. `llm-kickstarter-v2-2026-05-04.md` — INTERNAL (v0.next agent brief).
3. `x-snippet-zod-calibration-2026-05-06.md` — INTERNAL (X-post paste-ready, Bryan-controlled).

No moves; no `docs/drafts/` migration. The `published: false` frontmatter + filename heuristic (`llm-kickstarter-*`, `*-snippet-*`, `*_tweet*`) is sufficient signal.

---

## §4 Borderline items surfaced for D-4 user disposition

These items require user input BEFORE any D-2 edit pass can proceed:

### Q1 — kickstarter v1 + v2 `login()` example: structural rewrite OR mechanical fix?

**Sites:** v1 lines 308, 311; v2 lines 858, 861. Both files use `if (!user) return null` + `: null` ternary as canonical scrml code (not as "before" anti-pattern).

**Options:**
- (a) **Mechanical:** `return null` → `return not`; `: null` → `: not`. ~5 min per article. Preserves the JS-flavored ternary shape.
- (b) **Structural (per pa.md Rule 3 + S89 §3.3 #1):** rewrite `login()` to failable-fn shape: `server function login(...)! -> LoginError { ... fail LoginError::InvalidCredentials }` with caller-site `!{}` arm. ~30-60 min per article (mirrors). Teaches canonical error model.

S89 audit recommends (b). Awaits user disposition.

### Q2 — kickstarter v2 + primer `default=null`: stop at corpus OR coordinated SPEC edit?

**Sites:** kickstarter v2 line 243; primer line 90 (separate file). SPEC.md §6.4 itself shows `<startTime default=null>` (lines 4832, 4834) — both primer and kickstarter mirror canonical SPEC text.

**Options:**
- (a) Stop at corpus (no SPEC change): primer + kickstarter v2 MUST stay with `default=null` (Rule 4 spec is normative).
- (b) Coordinated SPEC + corpus: edit SPEC §6.4 to `default=not`, then update primer + kickstarter in same commit. SPEC-INDEX may need ~58-line range regeneration.

W-3 sub-task in Wave 4 SCOPING owns the SPEC side. Awaits user disposition.

### Q3 — mutability-contracts `(null -> T)` lifecycle syntax: published-immutable or republish-with-edit?

**Sites:** article lines 129-130 (struct field example with `passwordHash: (null -> string)`); lines 232, 248, 250 (prose references).

The article's own Status banner (line 14) frames the lifecycle/typestate layer as "SPEC-ratified design surfaces that are not yet implemented in the v0.2.4 compiler." Per S81 directive ("null in no context"), the `null` token in `(null -> T)` is technically forbidden by stated intent.

**Options:**
- (a) Leave as-is (Rule 1 immutability; article is published; the lifecycle syntax is preview-of-future-feature and SPEC needs to migrate first).
- (b) Republish with `(not -> T)` syntax (if SPEC ratifies a `not`-flavored lifecycle annotation first).

Both depend on upstream SPEC decision. Awaits user disposition.

---

## §5 What D-1 does NOT do

Per pa.md Rule 4 + task discipline:

- **No edits applied.** This is a classification table only. D-2 + D-3 + D-4 are separate sub-tasks.
- **No re-audits of articles already in S89 audit scope.** S89 audit findings were verified against current article content; no new drift surfaced.
- **No dispositions on SPEC.md or primer.** Wave 4 SCOPING §5 W-3 owns those — pa.md Rule 1 + S81 directive interplay is upstream.
- **No reconciliation of `scrml-support/archive/articles-skipped/scrml-debate-amends-zod-claim-*` duplicate.** Cleanup task flagged in §1 row 11 but not in D-1 scope (mechanical cleanup; can be folded into D-3 if user authorizes).

---

## §6 Cross-references

- Wave 3.7 corpus-ouroboros audit: `docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md` (S89; baseline for §4 migration backlog + §5 deferred items).
- S57 ARTICLE-TRUTHFULNESS-AUDIT: `docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md` (stale on tier-ladder + S57 v0.2.0 framing; superseded by S84 W2-3 + S89 findings).
- Wave 4 adopter content SCOPING: `docs/changes/wave-4-adopter-content/SCOPING.md` §4 articles triage + §9.2 kickstarter posture + §9.4 v0/v1/v2 publishing posture.
- S84 changelog W2-3: `docs/changelog.md` line 329 (5 articles publishable per user-decision queue).
- pa.md line 319 (kickstarter v1 dispatch dependency).
- pa.md Rules 1 + 3 + 4 (immutability + structural-over-mechanical + spec-is-normative).

## §7 Tags

#wave-4 #d-track #d-1 #articles-currency #s89 #s84 #pa-rule-4 #corpus-ouroboros
