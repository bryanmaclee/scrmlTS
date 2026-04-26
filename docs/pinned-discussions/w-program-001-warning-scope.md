# Pinned: W-PROGRAM-001 — warning scope and the sample-corpus question

**Status:** PINNED for further discussion
**Opened:** 2026-04-25 (S42)
**Origin:** Scope C Stage 1 audit — `docs/audits/scope-c-stage-1-2026-04-25.md` §6
**Working disposition:** Option 1 (path-based suppression in `samples/compilation-tests/`) for now. Not yet implemented.
**Authorization status:** Disposition direction acknowledged by user. **No compiler change authorized.** This is a working assumption for downstream audit work, not a green-light to patch.

---

## What surfaced this

The Scope C Stage 1 sample-classification audit found that **`W-PROGRAM-001` fires on 224 of 229 warn-only samples (~98%)** in `samples/compilation-tests/`. Every sample without an explicit `<program>` root triggers it. This dominates the warning bucket and obscures real issues (the other ~5% is the actually-interesting stale-shape signals — `W-LINT-007/013`, `W-CG-001`, `W-AUTH-001`, `W-LINT-002`).

Behavior is correct for runnable apps — the kickstarter even relies on it ("Without `<program>`, the compiler emits W-PROGRAM-001 immediately"). But the sample corpus is mostly syntax fragments (`basic-001-empty.scrml`, `basic-002-single-tag.scrml`, …) that exist to test single features, not complete apps. The warning fires in the wrong context for that corpus.

## Options considered

| Option | Mechanism | Cost | Risk |
|---|---|---|---|
| **1. Path-based suppression** | Skip W-PROGRAM-001 when source path is under `samples/compilation-tests/` | Lowest — small compiler change | Hides real issues in samples that DO test app-shape |
| 2. Opt-out marker | Magic comment `// @no-program-root` per file | Per-file annotation across 224 files | Most explicit, slowest |
| 3. Heuristic detection | Only fire when file has substantial markup AND no `<program>`; suppress for tiny fragments | Compiler heuristic (line count? element count?) | Heuristic = false-positives + false-negatives |
| 4. Severity downgrade to info | Demote W-PROGRAM-001 from warn to info | Mostly cosmetic | Doesn't solve noise in real apps, just reclassifies |
| **Alternative.** Mass-migrate samples | Wrap every sample in `<program>` | ~224 file edits, mechanical | Cleanest semantically; biggest commit; "samples are little programs" stance |

## Working disposition (S42)

User said: **"1 for now. I want to pin this issue for further discussion later."**

Interpretation:
- **Working assumption:** treat path-based suppression as the chosen direction for downstream audit reasoning. This means the Stage 1 audit (and any subsequent stages) can mentally subtract the W-PROGRAM-001 noise from the warn bucket and treat the remaining ~5 warning codes (W-LINT-002/007/013, W-CG-001, W-AUTH-001) as the actually-relevant signal.
- **NOT authorized:** an actual compiler change. The compiler still emits W-PROGRAM-001 on the sample corpus; the working assumption is a reasoning shortcut, not a code change.
- **Pinned for later:** the deeper question — whether `samples/compilation-tests/` is "fragment territory" by convention OR whether samples should be valid little programs — is parked for a real conversation. Likely couples to the Stage 1.4 classification (the 14 stale-shape samples and their root causes) and Stage 4 (full warn-only classification).

## What this leaves open (revisit list)

When the user wants to come back to this, these are the live questions:

1. **Convention question:** is `samples/compilation-tests/` officially "fragment territory" or "should-be-runnable apps"? The decision shapes which option lands.
2. **Heuristic feasibility:** if option 3 is preferred over option 1, what's the cleanest "needs `<program>`" predicate? (line count, element count, presence of `${...}` blocks, presence of `<button>/<form>/<input>`?)
3. **Mass-migrate cost vs benefit:** if the alternative is preferred, what's the mechanical cost? 224 files × small edit = scriptable. Worth doing if it makes the corpus self-consistent.
4. **Cross-corpus:** does this same question apply to `samples/compilation-tests/gauntlet-*/` subdirs? They have ~509 fixtures recursively — same problem, larger blast radius.
5. **Coupling to lint scoping bug:** `W-LINT-007` and `W-LINT-013` also misfire (firing on comment text and on `@reactive` reads — see Stage 1 audit §4). Whatever scoping mechanism the W-PROGRAM-001 fix lands on may inform those lint fixes too.

## Cross-references
- Stage 1 audit: `docs/audits/scope-c-stage-1-2026-04-25.md` §6 (sample classification numbers)
- Sample classification report: `docs/audits/scope-c-stage-1-sample-classification.md`
- Raw audit data: `docs/audits/.scope-c-audit-data/`
- W-LINT scoping issues (related family): Stage 1 audit §4 Issue A + Issue B
- User-voice capture: `scrml-support/user-voice-scrmlTS.md` §S42 (W-PROGRAM-001 disposition entry)

## Tags
#pinned #w-program-001 #warning-scope #sample-corpus #scope-c-stage-1 #compiler-intake-candidate
