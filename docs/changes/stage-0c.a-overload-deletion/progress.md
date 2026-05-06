# Stage 0c.A — Function-overload deletion progress

Re-dispatch (no isolation). Working directly on scrmlTS main.

## Baseline (2026-05-06)
- HEAD: c8c8bb93a22b36d05099dd0d0fcd0b4acc80ae55
- Working tree: clean
- Test counts: 8933 pass / 44 skip / 1 todo / 0 fail / 31612 expect calls / 8978 across 440 files
- Note: dispatch said expected baseline ~8209; actual is 8933. Expected post-deletion: ~8928 (drop of 5).

## Timeline

- 2026-05-06 baseline captured. Audit §8 read; scope confirmed (13 src sites + 5+ tests + README).
- Survey: all line numbers within 1-2 of audit citations. emit-client.ts call site verified at 545-547 (audit said 545-547). All other sites match.
- workspace-l2.test.js decision: line 11 mention "the workspace-aware overloads of analyzeText / buildDefinitionLocation" refers to TypeScript function-overload signatures (multiple call signatures of TS functions), NOT the SCRML state-type overload feature. INCIDENTAL — leave untouched.

