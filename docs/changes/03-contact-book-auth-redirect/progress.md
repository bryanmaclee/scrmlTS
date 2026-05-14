# 03-contact-book auth-redirect fix — progress

## Brief

E (CLI generator) + A (two-tier severity) paired fix per SCOPING.md.

Two-tier severity per brief amendment to OQ-1:
- Keep `I-AUTH-REDIRECT-UNRESOLVED` (info) for typo case (redirect target doesn't match an existing page URL pattern).
- Add NEW `W-AUTH-LOGIN-MISSING` (warning) for structural gap (no /login page anywhere in the compilation unit when auth gates exist).

## Steps

- [x] Sub-task A — auth-graph classifier extension + W-AUTH-LOGIN-MISSING (33b3d85)
- [x] SPEC.md catalog rows (§34 + §40.9.11) (d788651)
- [x] Unit tests for new lint (10 tests in auth-graph-login-missing.test.ts)
- [x] Sub-task B — generate.js CLI subcommand + cli.js wire (a099e7d)
- [x] stdlib/auth/templates/login.scrml template (a099e7d)
- [x] commands/generate-auth.test.js (12 tests, all pass)
- [x] examples/03-contact-book.scrml update (dropped auth="required" + protect=password_hash)
- [x] e2e/tests/03-contact-book.spec.ts cleanup (auth-noise filters removed)
- [x] SPEC.md §52.13 cross-ref (in d788651)
- [x] master-list.md §B CLI commands row

## Log

- (start) startup verified; scoping read in full; auth-graph.ts + login template + cli.js + init.js studied.
- 33b3d85 Sub-task A landed — W-AUTH-LOGIN-MISSING tier-2 warning + 10 unit tests.
- d788651 Sub-task A.3 SPEC catalog rows landed (§34 + §40.9.11 + §52.13 cross-ref).
- a099e7d Sub-task B landed — generate.js + cli.js wire + login template + 12 generate-auth tests.
- 03-contact-book.scrml + e2e spec cleanup + master-list row committed in final wrap.

## Notes

- Worktree SPEC.md base is at 8cef7f5 (S89), predating main's bf2b098 (A-3.5
  S91 catalog). The W-AUTH-PAGE-INFERRED / I-AUTH-REDIRECT-UNRESOLVED /
  E-AUTH-GRAPH-001..004 / E-CLOSURE-002 rows that exist on main were NOT in
  the worktree's SPEC.md. My W-AUTH-LOGIN-MISSING row was anchored at
  W-AUTH-RUNTIME-FALLBACK (the last row that exists in both). PA must
  CHERRY-PICK this commit onto main's SPEC.md state to preserve sibling
  rows. See memory feedback_file_delta_vs_cherry_pick.md.
- 03-contact-book.scrml had a leftover \`protect="password_hash"\` despite no
  password column in contacts. That auto-escalated auth via W-AUTH-001 even
  AFTER removing \`<program auth="required">\`. Dropped \`protect=\` from the
  example since it was vestigial confusing scaffolding.
- W-AUTH-LOGIN-MISSING does NOT fire on auto-escalated auth (protect= →
  RouteMap.authMiddleware path) — only on explicit auth gates in AuthGraph
  .gates. This is a known scope boundary; flagged for follow-up.
