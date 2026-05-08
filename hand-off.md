# scrmlTS — Session 71 (PENDING OPEN)

**Status:** placeholder for S71 open. Will be populated at session start with state read from `handOffs/hand-off-70.md`.

**Previous session close:** `handOffs/hand-off-70.md` (S70 — A7 parser+typer COMPLETE · A1c kicked off · 12 commits + push)

**Tests at S70 close:** 9,752 / 60 / 1 / 0 (full); 9,028 pre-commit subset.

**Cross-machine pickup expected.** User signaled at S70 wrap: moving to other machine, expects seamless start. Both scrmlTS + scrml-support pushed clean at S70 wrap.

---

## Open questions to surface immediately at S71 open

(Inherited from hand-off-70 §"Open questions to surface immediately at S71 open"):

1. **Push state verification** — confirm `git fetch origin && git rev-list --left-right --count origin/main...HEAD` returns `0 0` for both scrmlTS + scrml-support at S71 open.

2. **Next phase: A1c C1 dispatch.** BRIEF ready at `1b9bab1`. Phase 0 SURVEY + implementation, ~4-6h dispatch cycle. Closes pre-existing S61 Step 11.5 deferred Shape 3 V5-strict codegen gap.

3. **C1 BRIEF's S61 11.5 gap claim verification** — read `compiler/src/codegen/emit-logic.ts:565-700` to confirm Shape 3 V5-strict still routes through `_scrml_reactive_set` (the bug C1 closes).

4. **A5-4/A5-5/A5-6/A5-7 status** — A7 parser+typer COMPLETE; codegen-side may fold into A1c engine wave (C12-C15) per S70 sequencing. Decide at S71 whether to dispatch A5-4 separately or fold.

---

## Tags

#session-71 #pending-open #cross-machine-pickup #post-s70-wrap #a1c-c1-next
