# Article truthfulness audit — 2026-05-05 (S59)

**Driver:** S59 user concern — given v0.2.0 in flight as a major breaking change, are publicly-posted articles accurate enough to remain truthful, or do some need edits / retractions / takedowns?

**Methodology:** PA scanned the 15 article files in `docs/articles/`. Each assessed for code-block truthfulness against the **actual current parser state** (per `PARSER-AUDIT-2026-05-05.md`) and **stdlib state**. PA does NOT have visibility into what's actually live on dev.to / scrml.dev — repository `published: false` means "draft in repo," not "not posted." The user must cross-reference this audit against actual public posts.

**Truthfulness classifications:**

- **ACCURATE** — claims align with what scrml does today. Safe to keep public.
- **NEEDS-EDIT** — most claims hold; some details mislead. Recommend edits to cite "in flight for v0.2.0" or remove the misleading specifics.
- **RETRACT** — central claims describe features not yet shipped; editing to keep truthful would gut the article. Recommend retraction or "this describes a v0.2.0 design in flight" header banner.
- **DO-NOT-PUBLISH** — pre-publication; describes v0.next design only; should remain unpublished until v0.2.0 ships the relevant phase.

---

## §1 Audit table

Repo frontmatter `published:` field tracks dev.to staging state, NOT public posting state. Articles below are sorted by recommended action urgency.

| Article (file) | Frontmatter `published:` | Code uses v0.next-only syntax | Concept aligned with current scrml? | **Recommendation** |
|---|---|---|---|---|
| `tier-ladder-promotion-devto-2026-05-04.md` | false | YES (7 instances; entire premise = Tier 0/1/2 ladder, engines, validators) | NO — features in flight, not shipped | **DO-NOT-PUBLISH** until A2 (engines) lands. User-controlled drop. |
| `realtime-and-workers-as-syntax-devto-2026-04-29.md` | false | YES (1 instance: `@shared messages = []` — DEPRECATED in v0.next per L4) | PARTIAL — `<channel>` exists but architecture is changing | **NEEDS-EDIT** before publishing: remove `@shared`; note v0.next channel-form is in flight |
| `mutability-contracts-devto-2026-04-29.md` | false | MIXED (`@email: string(email)` works; refinement-type predicates `number(>0 && <10000)` are §53 aspirational) | PARTIAL — basic type guards work; full predicate language is v0.next | **NEEDS-EDIT** if publishing: separate "works today" examples from "coming in v0.2.0" with a clear divider |
| `components-are-states-devto-2026-04-29.md` | false | 0 v0.next markers in code blocks (mostly React-tsx contrast) | Conceptually aligned with L1 pillar; some code uses pre-v0.next forms | **ACCURATE-with-caveat** — concept holds; if any scrml code shown uses v0.next-only forms, edit those |
| `server-boundary-disappears-devto-2026-04-28.md` | false | MIXED (server fn works; refinement-type predicate args `List<Item>(@length > 0 && @length < 100)` is v0.next) | Server-fn boundary works in v0.1.0; predicate args do not | **NEEDS-EDIT** if publishing: remove the predicate-arg refinement examples or note "in flight" |
| `npm-myth-devto-2026-04-28.md` | false | none flagged | "kills ~80% of typical-app npm needs" — true given 16-module stdlib | **ACCURATE** (modulo any specific claim verification — review pass recommended) |
| `orm-trap-devto-2026-04-29.md` | false | none flagged | SQL passthrough (`?{...}`) works in v0.1.0 | **ACCURATE** (review pass recommended) |
| `css-without-build-step-devto-2026-04-29.md` | false | none flagged | CSS-with-`@scope` works in v0.1.0 | **ACCURATE** (review pass recommended) |
| `lsp-and-giti-advantages-devto-2026-04-28.md` | false | none flagged | LSP exists; giti integration claims need user verification | **ACCURATE** subject to giti-claim review |
| `why-programming-for-the-browser-needs-a-different-kind-of-language-devto-2026-04-27.md` | false | none flagged | Concept-only positioning piece | **ACCURATE** |
| `lsp-and-giti-advantages-draft-2026-04-25.md` | (draft, no frontmatter) | none | superseded by devto version | **DRAFT — not for publishing** |
| `npm-myth-draft-2026-04-25.md` | (draft) | none | superseded by devto version | **DRAFT — not for publishing** |
| `llm-kickstarter-v0-2026-04-25.md` | (internal LLM doc) | YES (1 instance) | superseded by v2 | **INTERNAL — superseded by v2; do not publish externally** |
| `llm-kickstarter-v1-2026-04-25.md` | (internal) | YES (1 instance) | superseded by v2 | **INTERNAL — superseded by v2; do not publish externally** |
| `llm-kickstarter-v2-2026-05-04.md` | (internal) | YES (18 instances) | this IS the v0.next anchor; intended for LLM dev-agent dispatches, NOT public consumption | **INTERNAL — explicitly v0.2.0 in-flight reference, do not publish as a "scrml today" piece** |

---

## §2 Per-article detail (RETRACT / NEEDS-EDIT only)

### tier-ladder-promotion (DO-NOT-PUBLISH)

**Premise:** describes Tier 0/1/2 ladder for case analysis on enums (booleans-as-lifecycle → `<match>` → `<engine>`). Article shows promotion code: `<isLoading>=false; <isError>=false` (Tier 0 booleans-as-lifecycle), then `<match for=Phase>` (Tier 1), then `<engine for=Phase initial=.Idle>` (Tier 2).

**Reality check (per PARSER-AUDIT):**
- Tier 0 form `<isLoading> = false` outside `${}` — **NOT-AT-ALL** (E-CTX-003).
- Tier 0 form inside `${...}` — **HTML-FRAGMENT** silent swallow.
- Tier 1 `<match for=Type>` block — **NOT-AT-ALL** (E-COMPONENT-035).
- Tier 2 `<engine for=Phase initial=.Idle>` — **NOT-AT-ALL** (E-ENGINE-020 expects pre-S25 `<machine>` form).

**ZERO of the article's central code examples compile cleanly today.** Publishing this now would show the world a feature that's entirely vapor.

**Recommendation:** keep `published: false` until **Phase A2 (structural elements)** lands at minimum (engines + match block parsing). Then sanity-check every example compiles before flipping `published: true`.

### realtime-and-workers-as-syntax (NEEDS-EDIT)

**Premise:** "Stop wiring WebSockets and workers by hand. The language declares them." Shows a `<channel>` block with reactive-cell sync.

**Reality check:**
- `<channel>` opener is recognized today (`kind: "state" stateType="channel"` via existing markup-tag-style state opener path, similar to schema).
- `@shared messages = []` modifier is **REMOVED** in v0.next per L4 — but it's a current scrml form (works today via `reactive-decl` w/ `@shared` flag, presumably).
- The article CURRENTLY USES `@shared` which works today but is being deprecated.

**The honest framing:** `@shared` works in v0.1.0. v0.next removes it (cells in channel body auto-sync by being there). The article should either (a) keep `@shared` and add a "as of v0.2.0 you can drop the `@shared` modifier; channel-body cells auto-sync" footnote, or (b) preview the v0.next form and note it's coming.

**Recommendation:** **NEEDS-EDIT** — add a brief "v0.2.0 simplifies this further: cells in channel body auto-sync without the `@shared` modifier" callout at the channel-decl section. Otherwise the article goes stale on v0.2.0 ship date.

### mutability-contracts (NEEDS-EDIT)

**Premise:** "type system can own mutability/validity/contracts." Shows `@amount: number(>0 && <10000)` refinement-type predicates and brand syntax `[order_amount]`.

**Reality check:**
- Type-annotation form `@varname: T` works in v0.1.0.
- Predicate args inside type `number(>0 && <10000)` is §53 refinement-type predicate — v0.next territory (PARSER-AUDIT F23: HTML-FRAGMENT in `<x>: T(...)` form; need to test whether `@x: T(...)` form works, but probably not at the predicate level).
- Brand syntax `[order_amount]` — PA does not see this in current SPEC; appears to be aspirational extension.

**Recommendation:** **NEEDS-EDIT** if publishing now — split examples into "works today" vs "v0.2.0+" with a clear divider; OR add an "in flight" header banner.

### server-boundary-disappears (NEEDS-EDIT)

**Premise:** "Stop writing API routes. The compiler does it." Server-fn examples + `?{}` SQL passthrough + refinement-type predicate args on parameters.

**Reality check:**
- Server fn (`server function`/`server fn`) works in v0.1.0.
- `?{}` SQL passthrough works.
- Parameter type `List<Item>(@length > 0 && @length < 100)` predicate — v0.next territory.

**Recommendation:** **NEEDS-EDIT** — remove parameter-predicate examples or move them to "v0.2.0+" callout. Server-fn boundary disappear claim is otherwise solid.

---

## §3 Cross-cutting findings

### §3.1 Voice-fidelity preserved

The articles maintain user-voice fidelity per `scrml-voice-author` lessons (per the metadata trail visible in `components-are-states`'s commented voice-notes block). User has been disciplined about not over-claiming framework experience. Truthfulness on the V0.1 → V0.2 axis is the new concern.

### §3.2 The pattern across NEEDS-EDIT articles

Most NEEDS-EDIT articles are not catastrophically wrong — they show a feature that PARTIALLY works today + leans on v0.next aspirational features for a key punchline. The smallest fix per article is: **add a "Status: v0.2.0 is in flight; this article describes the v0.1.0 baseline + selected v0.2.0 design previews; concrete code marked [V0.2.0+] will not compile until v0.2.0 ships" banner near the top.** This preserves the articles as documentation while being honest about what's deployed.

### §3.3 README + scrml.dev are the load-bearing signal

If README + scrml.dev clearly state v0.1.0 is shipped + v0.2.0 is in flight + breaking changes coming, individual article truthfulness becomes less critical. The signal at the project's front door does most of the work; per-article disclaimers become reinforcement rather than primary defense.

---

## §4 Recommendations summary

1. **`tier-ladder-promotion`** — keep `published: false`. Re-verify after A2 (engines) lands. Don't publish before then.
2. **`realtime-and-workers`** — `NEEDS-EDIT`. Add v0.2.0-removes-`@shared` callout. Then publishable.
3. **`mutability-contracts`** — `NEEDS-EDIT`. Split "works today" vs "v0.2.0+". Or add header banner.
4. **`server-boundary-disappears`** — `NEEDS-EDIT`. Remove or banner the parameter-predicate examples.
5. **`components-are-states`** — quick re-verify pass. Concept solid.
6. **Other 5 devto articles** — `ACCURATE` modulo a precision-claims review (npm-myth's "80%", giti integration claims, etc.).
7. **Drafts (`*-draft-*`)** — superseded; don't publish.
8. **Kickstarter v0/v1/v2** — internal docs; never publish externally.
9. **README + scrml.dev** — add v0.1.0-shipped + v0.2.0-in-flight banner. The most important truthfulness-preserving move overall (see companion deliverable).

---

## §5 What PA cannot determine

PA cannot see:
- Which of these articles are actually live on dev.to right now (all show `published: false` in repo).
- Whether `scrml.dev` already has a v0.1.0/v0.2.0 callout.
- Per-article comment threads / community feedback that might indicate confusion.

**User must:** cross-reference this audit with actual public posting state. Articles flagged DO-NOT-PUBLISH or NEEDS-EDIT that are ALREADY PUBLIC need either edits, retractions, or takedown decisions per article.

---

## §6 Tags

#article-truthfulness-audit #v0next #v0.1-to-v0.2 #public-communication #retract-vs-edit #dev-to
