# Examples — Human Verification Log

Sibling to `README.md`. **README.md describes what each example demonstrates; this file tracks which examples the USER has personally verified work end-to-end** (compiled, run, output checked, behavior confirmed correct).

The PA can compile-test and check format compliance — that's automated and goes in the audit reports (`docs/audits/`). **"Human verified" is a stricter bar.** Only the user marks a row checked.

## Why per-commit hashes

Each verification is timestamped to the `git rev-parse HEAD` at which it was performed. Any commit advancing past the verified hash potentially stales the verification — a parser change, a codegen tweak, a stdlib refactor could regress an example without flagging in tests. The hash records "this worked at commit X." If HEAD is ahead of X, treat the verification as suggestive but not authoritative.

When an example's underlying file is modified, OR a fix touches the compiler subsystem the example depends on, the verification should be considered stale until re-checked.

## How to use this file (USER)

When you've verified an example:

1. Run it. Confirm correct output / behavior.
2. Replace the `[ ]` with `[x]` on the example's row.
3. Replace `—` in the "Verified at" column with the current `git rev-parse HEAD` (short SHA is fine).
4. Add notes if useful (e.g. "verified runs cleanly; styled correctly; data persists across reload").

The PA does NOT mark rows checked. PA's compile-tests are recorded in audit reports, separate from this file.

---

## Examples (22 files)

| # | Example | Verified | Verified at | Notes |
|---|---|---|---|---|
| 01 | `01-hello.scrml` | [ ] | — | |
| 02 | `02-counter.scrml` | [ ] | — | |
| 03 | `03-contact-book.scrml` | [ ] | — | |
| 04 | `04-live-search.scrml` | [ ] | — | |
| 05 | `05-multi-step-form.scrml` | [ ] | — | Currently uses if-chain workaround; full match-with-lift revert blocked on A7+A8 (see findings tracker) |
| 06 | `06-kanban-board.scrml` | [ ] | — | |
| 07 | `07-admin-dashboard.scrml` | [ ] | — | Uses `^{}` reflect() to generate table headers from User type |
| 08 | `08-chat.scrml` | [ ] | — | NOT real-time — for real-time, see 15-channel-chat |
| 09 | `09-error-handling.scrml` | [ ] | — | |
| 10 | `10-inline-tests.scrml` | [ ] | — | Test sigil `~{}` content; lint-clean post-A6 |
| 11 | `11-meta-programming.scrml` | [ ] | — | |
| 12 | `12-snippets-slots.scrml` | [ ] | — | Includes unnamed-children demo (S42) |
| 13 | `13-worker.scrml` | [ ] | — | |
| 14 | `14-mario-state-machine.scrml` | [ ] | — | |
| 15 | `15-channel-chat.scrml` | [ ] | — | NEW S42 — §38 real-time |
| 16 | `16-remote-data.scrml` | [ ] | — | NEW S42 — §13.5 RemoteData enum |
| 17 | `17-schema-migrations.scrml` | [ ] | — | NEW S42 — §39 declarative `< schema>`. Requires `examples/notes.db`. |
| 18 | `18-state-authority.scrml` | [ ] | — | NEW S42 — §52 Tier 2 scaffold. Emits W-AUTH-001 by design until detection ships (C2). Requires `examples/tasks.db`. |
| 19 | `19-lin-token.scrml` | [ ] | — | NEW S42 — §35 linear types. Uses direct `${ticket}` interpolation post-A4 fix. |
| 20 | `20-middleware.scrml` | [ ] | — | NEW S42 — §40 `<program>` attrs + `handle()` |
| 21 | `21-navigation.scrml` | [ ] | — | NEW S42 — §20 `navigate()` + `route` |
| 22 | `22-multifile/app.scrml` | [ ] | — | NEW S42 — §21 cross-file imports + pure-type files. 3 files in subdir. |

---

## PA's compile-test status (NOT user verification)

The PA compile-tests every example as part of audits and pre-commit hook gates. **This is automated and orthogonal to user verification.** Recorded here for transparency only.

- **Last automated compile-test of all 22:** S42 close (commit at session close — see hand-off and CHANGELOG-scrmlTS.md).
- **Result:** 22/22 compile.
- **Known WARN states (not failures):**
  - `18-state-authority.scrml` — W-AUTH-001 (§52 Tier 2 scaffold; expected until C2 lands)

If a future audit finds an example failing compile, the row above should also be flagged "PA-flagged-broken" so the user knows not to spend verification time on it until fixed.

---

## Tags
#examples #human-verification #per-commit-staleness-tracking #scrmlTS

## Links
- [README.md](./README.md) — descriptive index of what each example demonstrates
- `../docs/audits/` — PA's automated audit reports
- `../docs/audits/scope-c-findings-tracker.md` — current bug state that may affect example correctness
- `../../scrml-support/CHANGELOG-scrmlTS.md` — per-session change log
