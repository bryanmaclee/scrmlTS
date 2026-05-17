# Progress: m1-1-native-lexer-skeleton

- [08:30] Started — branch `changes/m1-1-native-lexer-skeleton` created off `cfd4786`
- [08:35] Verified worktree + bun install + pretest OK
- [08:40] Pre-snapshot recorded — 15018 pass / 3 pre-existing fail / 121 skip / 1 todo (668 files)
- [08:45] Maps consulted (primary, structure, domain) + DD §D2/§D3/§D4/§D5 + SPEC §4.15 / §51.0 / §6 / §42
- [08:50] span.scrml + token.scrml committed (`686f8ea`) — pure-data + tag catalog
- [09:00] cursor.scrml + lex-mode.scrml committed (`98f0eec`); engine declaration validates; surfaced ANOMALY-1 (line-comments + `${` literal inside state-child bodies)
- [09:05] bracket-stack.scrml + error-recovery.scrml committed (`9936525`)
- [09:25] lex-in-code.scrml committed (`14cc005`) — substantive InCode dispatcher with all multi-char operators, scrml extensions, brackets, regex-with-prev-token heuristic, numeric literal value parsing (DD §D1 canonical calc)
- [09:30] lex.scrml + 7 JS-host shadow files committed (`ac70da8`); surfaced ANOMALY-2 (compiler v0.3 strips function bodies in ${} blocks of SPA .scrml; shadow files are the documented workaround). Smoke test of lex() PASSES.
- [09:40] parser-conformance-lexer.test.js + parsers.js comparator + README.md committed (`a7b899d`) — 57 pass / 12 skip / 0 fail
- [09:45] Full directory compiles via `scrml compile compiler/native-parser/` (8 .scrml files, all PARSE clean)
- [09:50] Full `bun test` regression check: 15076 pass / 1 fail (down from 3) / 133 skip / 1 todo / 669 files. NET ZERO REGRESSIONS. +58 new tests, 2 prior failures incidentally cleared (likely flakes).
- [DONE] Ready for report

## CHECKPOINT — never required

The dispatch was completed in a single PA session without exhausting context. No checkpoint-resume cycle invoked.

## Commit list

- `c6d4c2e` — pre-snapshot + progress scaffold
- `686f8ea` — span + token catalog (D3)
- `98f0eec` — cursor + LexMode engine (D4 P5 / D2)
- `9936525` — BracketStack + ErrorRecovery engines (D2 / D4 P4)
- `14cc005` — InCode-state body (substantive M1.1 work)
- `ac70da8` — lex.scrml entry point + JS-host shadows
- `a7b899d` — conformance test + parsers.js comparator + README

## Tags

#scrmlts #m1-1 #native-parser #progress #done

## Links

- [pre-snapshot.md](./pre-snapshot.md)
- [compiler/native-parser/README.md](../../../compiler/native-parser/README.md)
- [compiler/tests/parser-conformance-lexer.test.js](../../../compiler/tests/parser-conformance-lexer.test.js)
