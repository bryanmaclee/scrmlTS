# Progress: v0next-spec-foundation-rewrite (Dispatch 1.5)

Branch: changes/v0next-spec-foundation-rewrite
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a88ca8b3861ca17f6

## 2026-05-04 START

Just done: Branch created. Startup verification complete.

State found:
- Commit 8ac5f3e does NOT exist in this worktree — §1.4/§1.5/§1.6/§3.4 NOT yet landed.
- DISPATCH-1.5-BRIEF-finish.md does NOT exist. Operating from original DISPATCH-1-BRIEF-foundation.md.
- SPEC.md is 21,861 lines (vs index's 20,521 — has grown since last index regen).
- §6 current structure: §6.1 Declaration, §6.2 Placement Rules, §6.3 Reactive Semantics, §6.4 Worked Examples (OLD), §6.5 Reactive Arrays (PRESERVE), §6.6 Derived (PARTIAL REWRITE), §6.7 Lifecycle (PRESERVE).
- §11 at lines 5326-5468 — full content present, needs fold.
- §34 ends at ~line 12944.

## 2026-05-04 §1 additions COMPLETE

- Added §1.4 Markup-as-First-Class-Value
- Added §1.5 The North Star + Tier 0/1/2 Commitment Ladder
- Added §1.6 V5-Strict Access Model
- Commit: a57b15b

## 2026-05-04 §3.4 addition COMPLETE

- Added §3.4 V5-Strict Access Form Per Context (table)
- Commit: 3e381a8

## 2026-05-04 §6 rewrite COMPLETE

- Renamed §6 title to "Reactivity and the V5-Strict Access Model"
- Replaced §6.1-§6.4 (OLD: Declaration, Placement, Semantics, Examples) with NEW:
  - §6.1 V5-Strict Access — The Two Forms
  - §6.2 Three RHS Shapes for State Declarations
  - §6.3 Compound State — Variant C
  - §6.4 Render-By-Tag Semantics
- §6.5 Reactive Arrays — PRESERVED
- §6.6 Derived Values — EXTENDED with §6.6.16 (in-compound const <x>) and §6.6.17 (markup-typed derived)
- §6.7 Lifecycle — PRESERVED
- Added §6.8 The `default=` Attribute and `reset(@cell)` Keyword
- Added §6.9 Hoisting Model
- Added §6.10 The `pinned` Keyword
- Added §6.11 Auto-Synthesized Validity Surface (stub pointing to §55)
- Added §6.12 State Object Content Inherited From §11
- Commits: 1eb6a6a, b50b2d4, f8a71fa

## 2026-05-04 §11 fold COMPLETE

- §11 content replaced with stub
- Content categorized: state declarations → §6; protect= / schema / authority → §52
- Fold decision log table included in stub
- Commit: e3728b1

## 2026-05-04 §34 error codes COMPLETE (+9)

- E-NAME-COLLIDES-STATE
- E-DERIVED-WRITE
- E-STATE-PINNED-FORWARD-REF
- E-CELL-NO-RENDER-SPEC
- E-CELL-RENDER-SPEC-NOT-BINDABLE
- E-RESERVED-IDENTIFIER
- E-SYNTHESIZED-WRITE
- E-RESET-NO-ARG
- W-LIFECYCLE-CANDIDATE
- Commit: cad4098

## 2026-05-04 SPEC-INDEX.md regen COMPLETE

- §1/§3/§6/§11 line numbers updated
- §6 title updated
- New Quick Lookup entries added (V5-strict, three RHS shapes, render-by-tag, default=, reset, hoisting, pinned, validity surface, markup-as-value pillar, north star)
- Commit: 1bfdd0a

## 2026-05-04 Cross-reference sweep COMPLETE

- §19 errorBoundary §11 refs updated → §11 (→ §6, §52)
- §39 schema §11 ref updated
- §48 fn §11 ref updated
- §52.7 heading §11 ref updated → §52 (see also §6.12)
- §54 nested substates §11 ref updated → §6.3; formerly §11
- No deprecated @ framings found
- Remaining §11 refs: all within §6.12 stub documentation (correct)
- Commit: 28fa729

## STATUS: ALL DISPATCH CRITERIA MET

Final SPEC.md: 22,253 lines (was 21,861 at start)

Open questions:
1. The DISPATCH-1.5-BRIEF-finish.md did not exist — ran from original Dispatch 1 brief.
   All content from the 1.5 dispatch prompt was addressed (the prompt described the same
   scope as the original brief, with the same §6/§11/§34/INDEX criteria).
2. §6.5/§6.7 content was PRESERVED verbatim as required — no contradictions with new framing found.
3. §6.6.16 / §6.6.17 use sequential numbering after existing §6.6.15; may need renumbering
   if §6.6 existing content is restructured in a later dispatch.
4. §38 channel body references in §6 — noted but not modified per dispatch scope restriction.
