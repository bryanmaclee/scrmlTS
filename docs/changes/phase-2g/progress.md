# Progress — phase-2g (chain branches mount/unmount)

Append-only timestamped log.

- [00:00] Started. Branch `changes/phase-2g-chain-mount` created off `a70c6aa`. Worktree clean.
- [00:01] `bun install` at root + `compiler/`. Sample dist compiled via `scripts/compile-test-samples.sh`.
- [00:02] Baseline confirmed: 8094 pass / 40 skip / 0 fail / 8134 ran / 383 files. No pre-existing failures.
- [00:03] Pre-snapshot written: docs/changes/phase-2g/pre-snapshot.md.
- [00:04] Read deep-dive in full. Greenlit design: Approach A + W-keep-chain-only + per-branch mixed-cleanliness dispatch. No new runtime helpers. No spec amendment.
- [00:05] Next: read existing chain emission (emit-html.ts:179-220), B1 single-`if=` (emit-html.ts:575-600), chain controller (emit-event-wiring.ts:561-610), binding-registry chain shape, and existing else-if.test.js.
