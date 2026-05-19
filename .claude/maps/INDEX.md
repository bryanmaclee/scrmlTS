# INDEX.md
# project: scrmlts
# updated: 2026-05-19T14:37:51-06:00  commit: 6616a69

> This file is a navigation alias. See `primary.map.md` for the full map index, project fingerprint, task-shape routing, and key facts.

## Quick Map List

| Map | Contents |
|-----|----------|
| [primary.map.md](./primary.map.md) | Fingerprint, map index, task routing, key facts |
| [structure.map.md](./structure.map.md) | Directory layout, entry points, S107 NEW match-statechild-parser.ts + 4 new tests + known-gaps.md + match-block-form-scoping/ |
| [dependencies.map.md](./dependencies.map.md) | Runtime + dev packages, internal pipeline graph (unchanged S104-S107) |
| [schema.map.md](./schema.map.md) | AST node types, IR types, MatchArmEntry / MatchArmAttr / MatchParseDiagnostic [S107], FileAST.hasResetExpr [S102] + hasEqualityExpr [S106], FunctionDeclNode.isPinned [S105], FormForExpansion/SchemaForExpansion/TableForExpansion |
| [config.map.md](./config.map.md) | Env vars (SCRML_PORT, PORT), CLI flags including --emit-per-route + --chunk-size-budget |
| [build.map.md](./build.map.md) | npm scripts, CLI subcommands, pre-commit hook, pre-push (release-tag README gate) |
| [error.map.md](./error.map.md) | CGError, runtime error classes, E-/W-/I- code families. S107: +4 E-MATCH-* + W-MATCH-RULE-INERT (SYM PASS 20) + bug-3 [BS]/[TAB] file:line:col carry. S105: +13 E-TABLEFOR-* + PASS 19 pinned-fn. |
| [test.map.md](./test.map.md) | bun:test, 714 files, 15,930 pass / 169 skip / 0 fail (S107 HEAD); pre-commit 13,087 / 681 files; +4 new test files S107 |
| [domain.map.md](./domain.map.md) | 40+ pipeline concepts. S107: match block-form §18.0.1 + SYM PASS 20 + STRUCTURAL_RAW_BODY_ELEMENTS + bug-3 + bug-5 + known-gaps. S106: Phase 3.B B2 SHIPPED + PGO C1 + OQ-TF-13 helper. |
| [events.map.md](./events.map.md) | Channel placement, WebSocket pub/sub in compiled output (unchanged S91-S107) |
| [native-parser.map.md](./native-parser.map.md) | M1.x ladder (M1.1-M1.5 COMPLETE); 97 conformance tests; (unchanged S107) |
| [non-compliance.report.md](./non-compliance.report.md) | S107 refresh — known-gaps.md NEW (compliant) + match-block-form-scoping NEW (compliant) + Bug 6 closed; 2 uncertain (pre-S87 article + PRIMER stale) |

## State at HEAD

Commit: `6616a69`  Session: S107 close (2026-05-19)
Tests: 15,930 pass / 169 skip / 1 todo / 0 fail / 714 files (full pre-push)
Pre-commit subset: 13,087 pass / 88 skip / 1 todo / 0 fail / 681 files / 44,430 expect

## Tags
#scrmlts #map #index #navigation #s107 #v0.3.3

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
