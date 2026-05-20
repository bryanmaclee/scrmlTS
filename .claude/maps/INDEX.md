# INDEX.md
# project: scrmlts
# updated: 2026-05-20T00:30:00Z  commit: df1211d

> This file is a navigation alias. See `primary.map.md` for the full map index, project fingerprint, task-shape routing, and key facts.

## Quick Map List

| Map | Contents |
|-----|----------|
| [primary.map.md](./primary.map.md) | Fingerprint, map index, task routing, key facts |
| [structure.map.md](./structure.map.md) | Directory layout, entry points. **S108 NEW: emit-match.ts (~430L, match block Phase 3+4 codegen) + const-fold-env.ts (~155L, Bug 5 P3 Option γ).** Bug 4 C-narrow at block-splitter.js. Tailwind full-fix at tailwind-classes.js. PGO C2 in ast-builder.js + emit-client.ts. |
| [dependencies.map.md](./dependencies.map.md) | Runtime + dev packages, internal pipeline graph (unchanged S104-S108) |
| [schema.map.md](./schema.map.md) | AST node types, IR types. S108: **kind:"match-block" routed end-to-end via emit-match.ts**; `_constantFolded` marker on bare-expr/logic statements (Bug 5 P3); existing MatchArmEntry / MatchArmAttr / MatchParseDiagnostic [S107]. FileAST.hasResetExpr [S102] + hasEqualityExpr [S106] + **hasForStmt / hasChunkedMarkupTag [S108 PGO C2]**. FunctionDeclNode.isPinned [S105]. FormForExpansion/SchemaForExpansion/TableForExpansion. |
| [config.map.md](./config.map.md) | Env vars (SCRML_PORT, PORT), CLI flags including --emit-per-route + --chunk-size-budget |
| [build.map.md](./build.map.md) | npm scripts, CLI subcommands, pre-commit hook, pre-push (release-tag README gate) |
| [error.map.md](./error.map.md) | CGError, runtime error classes, E-/W-/I- code families. **S108: +1 W-TAILWIND-UNRECOGNIZED-CLASS (Bug 1 floor lint).** S107: +4 E-MATCH-* + W-MATCH-RULE-INERT (SYM PASS 20) + bug-3 [BS]/[TAB] file:line:col carry. S105: +13 E-TABLEFOR-* + PASS 19 pinned-fn. |
| [test.map.md](./test.map.md) | bun:test, **723 files**, **16,147 pass / 169 skip / 0 fail (S108 HEAD)**; pre-commit **13,304 / 690 files / 44,794 expect**; **+9 new test files S108** (match Phase 3+4 / Bug 5 P3 / Bug 1 unrecognized + arbitrary + minor + transform / Bug 4 / PGO C2). |
| [domain.map.md](./domain.map.md) | 40+ pipeline concepts. **S108: match block-form Phases 3+4 SHIPPED + Bug 5 P3 const-fold + SPEC §7.4.2 + Bug 1 floor lint W-TAILWIND-UNRECOGNIZED-CLASS + Bug 1 full-fix 3 waves + Bug 4 `?{` C-narrow (SPEC §4.17) + formFor B5 L2 label-store + PGO C2 fold.** S107: match block-form §18.0.1 + SYM PASS 20 + STRUCTURAL_RAW_BODY_ELEMENTS + bug-3 + bug-5 + known-gaps. |
| [events.map.md](./events.map.md) | Channel placement, WebSocket pub/sub in compiled output (unchanged S91-S108) |
| [native-parser.map.md](./native-parser.map.md) | M1.x ladder (M1.1-M1.5 COMPLETE); 97 conformance tests; (unchanged S108) |
| [non-compliance.report.md](./non-compliance.report.md) | S108 refresh — match-block-form-scoping CLOSED in main branch (Phases 1-4 shipped); Bug 5 P3 scoping closed; Bug 1 floor + full fix landed; Bug 4 C-narrow deep-dive in scrml-support. |

## State at HEAD

Commit: `df1211d`  Session: S108 close (2026-05-19)
Tests: 16,147 pass / 169 skip / 1 todo / 0 fail / 723 files (full pre-push)
Pre-commit subset: 13,304 pass / 88 skip / 1 todo / 0 fail / 690 files / 44,794 expect

## Tags
#scrmlts #map #index #navigation #s108 #v0.3.3

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
