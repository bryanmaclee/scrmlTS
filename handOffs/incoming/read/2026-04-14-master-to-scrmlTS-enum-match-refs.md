---
from: master
to: scrmlTS
date: 2026-04-14
subject: enum/match deep-dives and debate references
needs: fyi
status: unread
---

Collected references across the ecosystem for enum and match expression design work.

## Deep-Dives & Debates (scrml-support)

1. `scrml-support/docs/gauntlets/gauntlet-enum-match-report.md` — 5-developer gauntlet evaluating enum/match syntax; scored 3.9/10 for visual identity; recommends `::` → `.`, `->` → `=>`, `_` → `else`, adds `is` operator
2. `scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md` — Expression AST architecture including match operators and operator precedence
3. `scrml-support/docs/deep-dives/debate-control-flow-2026-04-08.md` — Control flow debate (Vue/Svelte/Solid/HTMX) covering match in markup context
4. `scrml-support/docs/deep-dives/debate-error-handling-2026-04-08.md` — Error handling syntax consistency with match arms
5. `scrml-support/docs/deep-dives/language-critic-full-sight-2026-04-04.md` — Language critique; flags P1 match codegen bug and incomplete enum features
6. `scrml-support/docs/deep-dives/lin-enforcement-ast-wiring-2026-04-11.md` — Linear type enforcement through match expressions
7. `scrml-support/docs/deep-dives/type-annotation-syntax-2026-04-08.md` — Type annotation debate including enum declarations

## Spec & Issues

8. `scrml-support/docs/reviews/language/spec-review-§18-rewrite-TS-C-gate-2026-03-27.md` — §18 (Pattern Matching & Enums) spec review with 11 blocking issues
9. `scrml-support/archive/spec-issues/SPEC-ISSUE-013-named-default-arm-binding.md` — Open design question on `else(binding)` syntax

## Archived Design Work

10. `scrml-support/archive/changes/.archive/batch3-designs/3b-enum-type-system.md` — Enum type system design, nullable inference, `is` operator
11. `scrml-support/archive/changes/.archive/enum-match-syntax-migration/design-review.md` — Syntax migration proposal (user-approved in S37)
12. `scrml-support/archive/changes/.archive/enum-match-syntax-migration/impact-analysis.md` — Migration impact across parser/rewriter/typechecker/codegen
13. `scrml-support/archive/changes/.archive/NESTED-MATCH-FIX/anomaly-report.md` — Nested match codegen bug (brace-depth-aware fix)
