# S19 Gauntlet Phase 2 — Control Flow bug list

**Run:** 110 fixtures, **62 MATCH / 48 non-match**. Independent verify via `scripts/gauntlet-s19-verify.mjs`.

## Triage categories

### A. Match exhaustiveness / typing (9 fixtures) — `checkExhaustiveness` orphan + arm type checks
- E-TYPE-020 non-exhaustive enum match (`phase2-match-non-exhaustive-026`)
- E-TYPE-023 duplicate arm (`phase2-match-duplicate-arm-030`)
- E-TYPE-024 match on struct (`phase2-match-on-struct-037`)
- E-TYPE-025 match on asIs (`phase2-match-on-asIs-103`)
- E-TYPE-026 match-in-markup-direct
- E-SYNTAX-010 else-not-last (`phase2-match-else-not-last-029`)
- E-SYNTAX-010 arm after else (`phase2-match-arm-after-else-extra-101`)
- E-SYNTAX-011 guard clause (`phase2-match-guard-clause-035`)
- W-MATCH-003 partial-all-covered (`phase2-partial-match-all-covered-042`)

### B. Error system / `fail`/`!` (3 fixtures) — §19
- E-TYPE-080 false-positive on `phase2-fail-in-failable-fn-076` (valid fail fires wrong code)
- E-ERROR-001 `fail` in non-failable fn (`phase2-fail-in-non-failable-077`)
- E-ERROR-002 bare failable call (`phase2-failable-unhandled-call-078`)

### C. JS-reflex traps (5 fixtures) — silently accepted
- `try/catch` (`phase2-try-catch-073`, `phase2-try-finally-074`)
- `throw` (`phase2-throw-statement-075`)
- `for-in` (`phase2-for-in-jsobj-053`)
- `if` single-line no braces (`phase2-if-single-line-no-braces-006`)

### D. `when` / reactive edge cases (3 fixtures)
- W-LIFECYCLE empty body (`phase2-when-empty-body-084`)
- W-REACTIVE self-write (`phase2-when-self-write-085`)
- nested when (`phase2-when-nested-086`)

### E. animationFrame lifecycle (4 fixtures)
- E-LIFECYCLE-015 zero args / non-fn misclassified as E-SCOPE-001
- E-LIFECYCLE-017 no-scope silent

### F. `while` / loop edge cases (6 fixtures)
- E-CTRL-005 break-missing-label (`phase2-while-break-missing-label-066`)
- E-CTRL-006 duplicate-label (`phase2-while-duplicate-label-067`)
- E-CTRL-007 break-crosses-fn (`phase2-while-break-crosses-fn-068`)
- W-ASSIGN-001 single-paren assign in while (`phase2-while-assign-single-paren-059`)
- `lift-in-fn` inside while (`phase2-while-lift-in-fn-062`)
- `while as-expr-bare` (`phase2-while-as-expr-bare-063`)

### G. `if`-as-expression + lift (4 fixtures)
- E-TYPE-031 no-else-narrow (`phase2-if-as-expr-no-else-narrow-010`)
- E-LIFT-002 multi-lift (`phase2-if-as-expr-multi-lift-011`)
- E-TILDE-001 tilde-partial (`phase2-if-as-expr-tilde-partial-012`)

### H. `if=` attribute / given (4 fixtures)
- E-CTRL-002 orphan else-if (extra E-SCOPE-001 flagged)
- E-CTRL-003 double-else (extra E-DG-002 + E-CTRL-001)
- E-SYNTAX-043 legacy `(x) =>` via given (same block-splitter deferral as Phase 3 A13)

### I. Misc
- `phase2-if-triple-equals-007` dev expected warning, compiler fires E-EQ-004 error (dev's expected-warning is wrong — Phase 3 wired this to error)
- `phase2-for-object-iteration-052` W-KEY-001 silent
- `phase2-return-top-level-080` silent (spec ambiguity)
- `phase2-for-else-no-lift-050` E-CTRL-010 silent

## Priority fix order

1. **A. Match exhaustiveness** — wire `checkExhaustiveness` (9 fixtures, highest ROI)
2. **B. Error system** — spec-§19 compliance (3 fixtures)
3. **C. JS-reflex traps** — user-reflex gap (5 fixtures)
4. **E. animationFrame** — misclassified as E-SCOPE-001 (4 fixtures)
5. **F. loop edge cases** — labels + W-ASSIGN edge (6 fixtures)
6. **D/G/H/I** — smaller cleanups

---

**Phase 2 verify baseline:** 62 / 110 MATCH before any fixes.
