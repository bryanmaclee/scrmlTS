# W1 — DG markup-context `reads` edge-lift (§40.9.3) — SURVEY-FIRST dispatch (S221)

Agent: scrml-js-codegen-engineer (ab777f6d, isolation:worktree, opus). Arc: Approach-A splitter
(`docs/changes/feel-of-performance-approach-a-impl-2026-06-26/SCOPE.md`).

SURVEY-FIRST because the PIPELINE "~40-80h unbuilt" estimate looks STALE — the code shows an A-1.x
wave partially landed (A-1.2 markup-read nodes, A-1.3 edge-emission "flag activated", A-1.6 consumer
audit, MARKUP_READER_SENTINEL, E-DG-002 sentinel-credit preserved-additive). Phase 0 establishes the
REAL delta (could be small: flip flag + finish A-1.6 + confirm RS precondition; or the real gap is W2
activation, not W1) before any build. Rule 4: code over derived-doc.

Phase 0 = survey + STOP-report (flag state · RS precondition/abort · E-DG-002 blast-radius · A-1.6
remainder · trucking --emit-reachability empirical). Phase 1 = bounded build only if confirmed.
Phase 2 = RS-no-longer-aborts-on-trucking + FULL suite 0-regression + within-node re-baseline +
markup-read repro shows the `reads` edge. STOP-if-materially-bigger.

(Full verbatim prompt: this dispatch's Agent call, S221 transcript.)
