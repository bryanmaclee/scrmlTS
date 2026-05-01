# Progress: f-auth-002

- [W5 START] Worktree verified clean. Rebased onto main HEAD `5c35618`. node_modules + dist symlinks created.
- [BASELINE] `bun test` from worktree compiler/ → 8361 pass / 40 skip / 0 fail / 29077 expect calls / 398 files. Matches expected pre-W5 baseline.
- [SCOPE] F-AUTH-002 = pure-fn file (e.g., `models/auth.scrml`) exporting `server function` with `?{}` cannot resolve db context against importing file's `<program db=>`. The dispatch app duplicates ~450 LOC of session/user lookup across M2-M6 because of this gap.
- [STRATEGY] Deep-dive §5.1 recommends Shape C: spec amendment (B) + impl resolves at import-site (A). Pure-fn files declare intent (e.g., via §21.5 modifier or syntax marker), impl resolves `?{}` against importing context's db.
- [NEXT] Reproduce bug → locate exact error emission → diagnose → spec contract → impl → tests → unblock demo.
