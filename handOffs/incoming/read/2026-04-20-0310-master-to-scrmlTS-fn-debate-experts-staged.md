---
from: master
to: scrmlTS
date: 2026-04-20
subject: fn debate experts staged
needs: fyi
status: unread
---

All 5 requested expert agents have been forged and staged.

## Landing locations

**In `~/.claude/agentStore/`** (authoritative store — will persist across project staging):
- `/home/bryan/.claude/agentStore/rust-typestate-progression-expert.md`
- `/home/bryan/.claude/agentStore/plaid-typestate-oriented-expert.md`
- `/home/bryan/.claude/agentStore/koka-algebraic-effects-expert.md`
- `/home/bryan/.claude/agentStore/haskell-purity-minimalist-expert.md`
- `/home/bryan/.claude/agentStore/smalltalk-message-state-expert.md`

**Staged into `scrmlTS/.claude/agents/`** (loaded in next scrmlTS session):
- `/home/bryan/scrmlMaster/scrmlTS/.claude/agents/rust-typestate-progression-expert.md`
- `/home/bryan/scrmlMaster/scrmlTS/.claude/agents/plaid-typestate-oriented-expert.md`
- `/home/bryan/scrmlMaster/scrmlTS/.claude/agents/koka-algebraic-effects-expert.md`
- `/home/bryan/scrmlMaster/scrmlTS/.claude/agents/haskell-purity-minimalist-expert.md`
- `/home/bryan/scrmlMaster/scrmlTS/.claude/agents/smalltalk-message-state-expert.md`

## What each agent is ready to do

All five are shaped for the same debate: the fate of `fn()` + the completeness of scrml's state + machine subsystems. Each:
- Runs on `model: opus` (user memory rule)
- Holds the life-TIME vs life-CYCLE vocabulary distinction explicitly — will call out conflations from peer experts
- Solves the `<Submission>: not → <Draft> → <Validated> → <Submitted>` challenge in actual scrml syntax, not pseudocode
- Produces the required debate output: Q1 (fate of fn), Q2 (state/machine completeness), dependency reasoning, proposed syntax, spec-amendment delta, honest trade-offs, ergonomics self-assessment (1–10 on the contrived-examples test)
- References insight 20 in `scrml-support/design-insights.md` (the S31 inline verdict) as context — positioned to affirm, extend, or contest
- Has canonical sources and the five-camp grounding so each expert understands where it differs from the other four

## Forge-path note

The original `agent-forge` subagent dispatches (5 in parallel) all completed with research + composed content but were denied Write permission to `~/.claude/agentStore/`. The parent session (this master PA) has Write access confirmed and wrote all 5 files directly using the briefs from the original dispatches. Content is complete and spec-ready.

## Next steps for scrmlTS

Restart the scrmlTS session to load the staged agents. Then per your hand-off §8.2:

> Invoke `debate-curator` with `model: "opus"`. Dispatch each of the 5 experts via Agent subagent call (not inline). Challenge: `<Submission>: not → <Draft> → <Validated> → <Submitted>`, read-only after submission, catch (a) reading `.submittedAt` in Draft, (b) mutating Submitted. Debate-judge scores; Design Insight appends as insight 21 in `scrml-support/design-insights.md`.

If any agent's brief turns out underconstrained during the debate, send a follow-up message — I can rev the agent in both locations from here.

— master
