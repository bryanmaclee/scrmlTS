# native-typed-atcell-decl-2026-06-05 — progress

R1 of the enum-subset cluster decomposition: native parser typed `@cell`
declaration (`@name: Type = e`) recognition. Parser-only, single-root,
emit-producing.

## 2026-06-05 — Startup + Phase-0
- Startup verified: worktree pwd `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4cbb2d7aab28b649`; `git rev-parse --show-toplevel` matches; `git merge --ff-only main` brought in F2-match + promote-each → HEAD 785f24d1; tree clean; `bun install` ok; `bun run pretest` populated dist.
- Maps: read `.claude/maps/primary.map.md` in full. Task-Shape "parser/grammar fix — NATIVE-PARSER swap-grind" routes `@`-prefixed decl families to `parse-stmt.js`. Map is 13+ native commits stale (HEAD f11db672); R1/R2/R3 cluster decomposition NOT yet in the map's family table (PA per-family-survey refinement). Verified locus against source directly.
- SYMPTOM CONFIRMED on HEAD 785f24d1: `${ ... @role: Role = .Admin }` (single-line + multi-line + plain `@count: int = 0`) all fail native with `E-EXPR-UNEXPECTED (Colon)` + `E-STMT-MISSING-SEMICOLON` + `E-STMT-UNEXPECTED-TOKEN` (phase=TAB); DEFAULT compiles exit 0. Plain form fails IDENTICALLY → confirmed typed-`@cell`-decl PARSE gap, NOT enum-subset-specific.
- Phase-0 step 1 (template): `parseServerAtStateDecl` (parse-stmt.js:3584) builds native `StateDecl{kind:"StateDecl", name, typeAnnotation, structuralForm:false, isConst:false, shape:"plain", defaultExprRaw:null, pinned:false, server:true, ..., init, span}`. translate-stmt `makeStateDeclNode` (959) bridges to live `state-decl` honoring `structuralForm`/`isServer`/`typeAnnotation`. LIVE oracle for `@name: T = e` is ast-builder.js:5524-5536 → `{kind:"state-decl", name, init, initExpr, typeAnnotation, shape:"plain", structuralForm:false, isConst:false, span}` — IDENTICAL to parseServerAtStateDecl minus `isServer:true`.
- Phase-0 step 2 (disambiguation): `@name` is ONE `ScrmlAt` token (lex-in-code.js:379). `@.`-sigil ScrmlAt carries name starting with `.` (351). Dotted path `@a.b` = ScrmlAt + Dot + Ident (separate). Clean lookahead: `ScrmlAt`(name not `.`-led) + `Colon` → new arm; `+Dot`/`+Assign`/anything-else → unchanged parseExprStatement. Baseline probes (barewrite/read/nestedassign/update/push) ALL compile native exit 0 pre-fix; emitted JS captured for byte-diff.
- Phase-0 step 3 (parity): default emit for b2head/plainline captured as parity targets.

## NEXT
- Add typed-`@cell`-decl arm to parseStatement (mirror parseServerAtStateDecl minus `server`).

## 2026-06-05 — Fix landed + Phase-3 verification
- FIX: `compiler/native-parser/parse-stmt.js` — added `atCellDeclNameFollows` predicate + `parseTypedAtStateDecl` function + a dispatch arm in `parseStatement`. The arm fires ONLY for `ScrmlAt`(declarable, name not `.`-led) + `Colon`. Mirrors `parseServerAtStateDecl` minus the `server` modifier → builds native `StateDecl{ structuralForm:false, shape:"plain", isConst:false, server:false, typeAnnotation, init, ... }`. translate-stmt `makeStateDeclNode` omits `isServer` (server!==true), byte-matching the live `@name: T = e` node (ast-builder.js:5524-5536). Committed 31a32aac.
- PARITY (emit byte-diff native vs default): plain `@count: int = 0` IDENTICAL; multiline enum `@role: Role = .Admin` IDENTICAL; subset `@role: Role oneOf([.Admin,.Editor]) = .Admin` IDENTICAL.
- DISAMBIGUATION non-regression (native emit byte-identical to pre-fix baseline): bare write `@name = e` (V-kill seam), `@name` read, `@obj.field = e` nested-assign, `@name++` update, `@arr.push()` array-mutation — ALL UNREGRESSED. The `:` lookahead routes ONLY the typed form.
- Phase-3(1) default green: b2 14/0, b4 16/0; full suite 23054 pass / 0 fail.
- Phase-3(2) native flip (api.js perl-flip, REVERTED after): b2 4→9 pass (5 R1-cleared: §6/§7/§8/§10×2 block-form @role decls). b4 4→9 pass (5 R1-cleared: §(c)×5 member-access typed @cell decls). TOTAL 10 R1-attributable fixtures cleared.
- Phase-3(3) within-node canary 1005/0, PARSE-FAILURE 0; no allowlist change, no upward bump.
- Phase-3(4) full suite 23054 pass / 220 skip / 1 todo / 0 fail (0 regressions). api.js flip reverted (git status clean, api.js not in diff).

## DEFERRED / SURFACED (NOT R1, separate roots)
- **Native single-line-multi-statement ASI gap (BROAD, separate root)**: `${ let a = 1 let b = 2 }`, `${ type X = {...} @y: ... }`, `${ type X = {...} let z = 1 }` — native ECMAScript-strict ASI (`canInsertSemicolon` requires `;`/newline/`}`/EOF boundary) rejects multiple statements on ONE source line; LIVE default accepts them. Fires for ANY following statement (plain `let let`, no `@`/`type` needed) → NOT typed-`@cell`-specific, NOT type-decl-specific. The b2/b4 BF_HEAD fixtures use the single-line form; R1's error-recovery lets the `@role` decl + downstream still parse (the ASI diagnostic is non-fatal-to-parse), so the block-form fixtures pass despite the extra `E-STMT-MISSING-SEMICOLON`. This ASI gap is a DISTINCT native-parity family, well outside the R1 charter — SURFACED, not fixed.
- Remaining b2 native fails (§2,§3,§4,§5,§11 — plain `let`/`const`, NO @-decl): native match-exhaustiveness/subset-resolution diagnostics not firing (E-MATCH-SUBSET-DEAD-ARM / W-MATCH-001 / E-TYPE-020). Failed identically pre-fix. Pre-existing native typer gap.
- Remaining b4 native fails (struct-ctor (b)×3, fn-return (a)×4): native E-CONTRACT-001 / E-TYPE-063 / bare-variant resolution + struct-constructor reach + fn-return-annotation enforcement. Failed identically pre-fix. Pre-existing native typer gap (maps' E-TYPE-063/E-VARIANT-AMBIGUOUS family). NOTE: this is R2 (struct-ctor) + adjacent.
- NOT TOUCHED per scope boundary: bare `@name = e` V-kill seam; R2 struct-ctor; R3 bare-variant-in-let.
- No-RHS typed `@x: T` (Shape-4 on legacy @-form) NOT handled — records E-STMT-STATE-DECL-INIT recovery diagnostic; the typed @-decl REQUIRES `=` on this path (mirrors parseServerAtStateDecl). SQL-init typed @-decl (`@x: T = ?{...}.method()`) NOT handled (parseServerAtStateDecl template doesn't either). Both adjacent, deferred.
