# Quoted-Text Model — Investigation Plan

**Status:** ACTIVE — investigation phase (go/no-go pending DD-3 + synthesis)
**Opened:** S110, 2026-05-20
**Working name:** "quoted-text model" (rename freely)
**Owner:** scrmlTS PA + the language designer

## The change under investigation

Today scrml markup-element bodies are **free text by default**. The block-splitter
("BS" layer, `compiler/src/block-splitter.js`) scans free text and *heuristically*
recognizes embedded code tokens (`${...}`, `<tag>`, `?{`, quote-delimited strings,
`/` closers). Misclassification is the root cause of a recurring bug class — Bug 2
(unpaired quote ate the file), Bug 4 (`?{` opened phantom SQL), the bare-`/`
`looksLikeCloser` heuristic. Each has been patched case-by-case.

The proposal: **display text becomes an explicit string literal.** `<state>"and"</>`
displays the string `and`; bare `<state>and</>` is code — a keyword or identifier.
This inverts the default — bodies are code, display text is the quoted exception —
making the text/code boundary explicit instead of heuristic.

Rationale (designer, S110):
- Eliminates the misclassification bug class at the root rather than patching cases.
- It is the V5-strict move applied to the text/code boundary — a mandatory visible
  marker kills a heuristic, exactly as `@` did for state access.
- More consistent with Pillar 1 (markup-as-value): bodies become uniform value
  sequences; the special "text run" node kind disappears.
- Prior art: Elm's `Html` (`text "..."`).
- Acknowledged cost: ceremony on the most common content (display text) — the
  "80% tax." Designer has weighed and accepted this in principle; quotes are
  keystroke-cheap, the residual cost is visual density, not typing effort.

## Decisions locked (S110)

| Decision | Resolution |
|---|---|
| Scope — all-bodies vs code-bearing-only | **Test both.** DD-1 + DD-2 evaluate all-display-text-language-wide AND code-bearing-bodies-only (engine state-children / match arms / `:`-shorthand) side by side; the debate picks. |
| Version horizon | **Decide after DD-3.** No version pre-committed; the depth-of-fix estimate sets v0.4 vs v1.0. Self-host is post-v1.0 and a from-scratch scrml rewrite — doing this before then is far cheaper; "much later" is off the table. |

## The program — 5 phases

### Phase 1 — DD-1: Current friction + prior art — COMPLETE (S110)
`scrml-deep-dive` (background). Output → `scrml-support/docs/deep-dives/quoted-text-model-friction-and-prior-art-2026-05-20.md` (816 lines).
**Bottom line:** the problem clears the bar for a fundamental change — structural
(12 BS heuristic mechanisms = the block-splitter's architecture), recurring (8
misclassification bugs, 1 still open; new ones arrive from routine work), measured
adopter-side (~3,849 entity-escapes, 83% of files), and already named as technical
debt inside the compiler (`engine-statechild-parser.ts`'s header documents its own
retirement condition).
**Scope finding (load-bearing):** the *measured* friction (12 heuristics / 8 bugs /
4 raw-text deferrals) is concentrated in code-bearing bodies, not `<p>` prose — it
justifies scope-variant **(b) code-bearing-only** on its own terms ((b) directly
retires the `engine-statechild-parser.ts` + `match-statechild-parser.ts`
re-tokenizers). Scope-variant **(a) all-bodies** is coherent but rests on a
consistency / Pillar-1 argument the friction data does not supply — (a) must be
argued, not assumed.

### Phase 2 — DD-2: Design space — COMPLETE (S110)
`scrml-deep-dive` (background). Output → `scrml-support/docs/deep-dives/quoted-text-model-design-space-2026-05-20.md` (1458 lines).
**All 6 design questions resolved → 16 named options, each with scrml syntax sketches.**
**Load-bearing finding — the 6 questions are not 6 forks.** Q-QT-2 (whitespace),
Q-QT-4 (`<pre>`), Q-QT-5 (BS inversion) pair *deterministically* with the scope choice
— the cross-pairings are incoherent. The debate collapses to: the **scope master fork**
(a vs b) carrying Q-QT-2/4/5, + **interpolation** (Q-QT-1) as the one independent fork,
+ Q-QT-3 (quote char) as a short slice.
**Reframe — (b) is the genuinely-novel design, not the "safe" one.** No language has
shipped a within-one-language code/text-default split; (b) IS that split. (a) has
whole-language prior art (Elm, F# Feliz). The debate weighs measured-friction (favors b)
against coherence-and-precedent (favors a).

### Phase 3 — Debate cluster — FRAMED; runs NEXT SESSION
DD-2 handed the framing. **Debate question:** *"Should the quoted-text model apply to
every markup body language-wide (scope a), or only to code-bearing bodies — engine
state-children / match arms / `:`-shorthand — leaving plain markup free-text (scope b)?
And does interpolation move inside the quoted string or stay a sibling value?"* — first
clause carries Q-QT-2/4/5; second clause is Q-QT-1; Q-QT-3 rides as a short slice (its
Option B — both `'`+`"` — reintroduces the Bug-2 surface; needs an explicit ruling).
**Roster — all 4 staged in `.claude/agents/`:** `elm-expert` (scope a / Pillar-1
carrier; argues Q-QT-1 sibling form), `jsx-expert` (scope b / free-text-for-prose
defender; sharpest interpolation voice), `simplicity-defender` (80%-tax skeptic /
smallest-coherent-version), `clojure-expert` (the homoiconic-mechanism voice — argues
`bare = code, quote = data` on its own terms; syntax-quote precedent for Q-QT-1).
**Timing:** the 3 newly-authored expert agents (elm/jsx/clojure) load as `subagent_type`s
only at next session start (the harness caches agent definitions at startup). Phase 3
runs NEXT SESSION — the framing is locked, nothing more to prep.

### Phase 4 — DD-3: Depth-of-fix
After debates, on the chosen approach / finalists. Every compiler layer touched
(BS inversion, tokenizer, ast-builder, codegen), the spec rewrite surface, the
migration (corpus + samples + examples + self-host), auto-migration tooling
feasibility, the estimate. Feeds the version-horizon decision.

### Phase 5 — Synthesis + go/no-go
PA synthesizes; designer calls go/no-go with a real cost in hand. If go → becomes
an implementation roadmap.

## Open-questions register

The designer answers questions as they surface. Live register:

| ID | Question | Status |
|---|---|---|
| Q-QT-1 | Interpolation — `${@x}` inside the quoted string vs a sibling value | DEBATE (Phase 3, clause 2) — the one genuinely-independent fork |
| Q-QT-2 | Whitespace + multi-line text semantics | RESOLVED-BY-COUPLING — pairs deterministically with Q-QT-6; not a standalone fork |
| Q-QT-3 | Quote char — `'` / `"` / both / backtick | DEBATE (short slice) — Option B (both) reintroduces the Bug-2 unpaired-quote surface |
| Q-QT-4 | `<pre>`/`<code>` subsumption | LARGELY RESOLVED-BY-COUPLING — pairs with scope; minor A-vs-C fork is a designer post-call |
| Q-QT-5 | BS-layer inversion shape | RESOLVED-BY-COUPLING — implementation consequence of scope; → DD-3 detail |
| Q-QT-6 | Scope — all-bodies (a) vs code-bearing-only (b) | DEBATE master fork (Phase 3); carries Q-QT-2/4/5 |
| Q-QT-7 | Version horizon | open — after DD-3 |
| Q-DD1-A | Per-scope heuristic-retirement count — how many of the 12 BS mechanisms does each scope variant retire? (the concrete depth-of-fix benefit figure) | open — DD-3 |
| Q-DD1-B | Does scope (b) *delete* `engine-statechild-parser.ts` + `match-statechild-parser.ts`, or only shrink them? | open — DD-3 |
| Q-DD1-C | Q-QT-2 (whitespace) and Q-QT-6 (scope) are COUPLED — a quoted string has unambiguous whitespace; a free-text `<p>` does not. Resolve together. | open — DD-2 |
| Q-DD1-D | The quoted-text model may subsume `<pre>`/`<code>` *better* than they currently work (exact-whitespace string literal vs `<pre>`'s indentation leaks) — weigh in Q-QT-4. | open — DD-2 |
| Q-DD1-E | Corpus-ouroboros — any migration tooling (DD-3) must not bake in current defensive shapes; the corpus is an artifact of the OLD model. | open — DD-3 |
| Q-DD2-A/B/C | DD-2 sub-questions — codegen auto-HTML-escape fork / `TextNode`-deletion blast radius / migration strictness (see DD-2 §Open Questions) | open — DD-3 or mid-debate sub-deep-dive |

New questions append here as the DDs surface them.

## Agent staging

Debates need real expert agents loaded, not synthesized. No `~/.claude/agentStore/`
exists on this machine; agents are PA-authored directly into `.claude/agents/`
(`agent-forge`'s Write step fails in this environment). Staged S110: `elm-expert`,
`jsx-expert`, `clojure-expert` (the homoiconic-mechanism voice — added per DD-2's
roster recommendation). `simplicity-defender` already exists globally. Agent files
load as `subagent_type`s only at next session start — staging now means Phase 3
debates run with real experts.

## Cross-references

- Bug 4 deep-dive (immediate-prior friction precedent) — `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md`
- `docs/known-gaps.md` — Bug 2 / Bug 4 entries
- `docs/changes/bs-layer-corpus-friction-bugs/` — prior dispatch dir for this bug family
- `compiler/src/block-splitter.js` — the BS layer
- SPEC §3 (context model), §4 (block grammar), §4.17 (`<pre>`/`<code>` raw-content / S101)

## Tags

#quoted-text-model #investigation #language-design #syntax #DD #debate #s110
