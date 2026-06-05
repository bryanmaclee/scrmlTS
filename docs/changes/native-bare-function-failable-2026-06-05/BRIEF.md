# DISPATCH BRIEF (verbatim) — native bare-`function` failable recognition
# change-id: native-bare-function-failable-2026-06-05
# agent: scrml-js-codegen-engineer · isolation: worktree · model: opus
# dispatched: 2026-06-05 (S166) · FINAL_SHA: dd0afc20 · branch: worktree-agent-a902a67a8980303f6

Native-parser fix — bare `function name()! -> Err` failable recognition. The native parser
(compiler/native-parser/) did NOT recognize the trailing `!` failable marker + error-type
annotation on a BARE `function` declaration — only on fn/server/pure. Dropped failable metadata
across ~31 test files. Mechanical port of an already-proven block. `.js`-only compiler-source change.

DISCIPLINE BLOCKS (full text in the S166 transcript / pa.md): F4 startup-verification + path
discipline (S42/S90/S99/S126 — Bash-edit on worktree-absolute paths, no `cd` into main); S112
merge-startup (`git merge --ff-only main`); MAPS-required-first-read (S82, watermark e947c924);
commit-discipline (S83 two-sided, per-fix commits, clean status before DONE, echo pwd in first
commit); `.scrml` mirror feature-stale note (S162 — .js-only).

PHASE 0 — verify root, STOP-IF-DIVERGENT. Hypothesis: bare `function` → parseStatement
(parse-stmt.js:636-637 KwFunction → parseFunctionDecl) → parseFunctionDecl (1676) has NO trailing-`!`
handling; the proven canFail/errorType block is in parseScrmlFunctionDecl (1843, makeFunctionDecl
7-arg call at 1963); parseFunctionDecl's makeFunctionDecl call (1712) passes only 6 args → metadata
dropped. Build a minimal bare-`function` failable reproducer, compile DEFAULT vs --parser=scrml-native,
byte-diff EMITTED output (not exit code). PROCEED if confirmed-mechanical; STOP-and-report if the root
diverges / a design call is needed / scope balloons.

PHASE 1 — fix: port the `!` + `! -> ErrorType` / `! ErrorType` consumption (with R25-Bug-36
disambiguation) from parseScrmlFunctionDecl into parseFunctionDecl (between parseParamList and the
body parse, before `-> ReturnType`); thread `{canFail, errorType}` as makeFunctionDecl's 7th arg at
1712. Do NOT touch the fn/server/pure path or the legacy BS+TAB pipeline. .js-only (mirror is stale).

PHASE 2 — verify (MANDATORY): R26 emitted-output native==default on the reproducer + node --check;
targeted native+default on browser-error-boundary / conf-error-boundary / r25-bug-36-bare-error-type;
full `bun run test` 0-fail (baseline 23,054/0; within-node 1005/0 — report any delta, do NOT
mass-rebump without flagging).

Report: Phase-0 verdict; WORKTREE_PATH + FINAL_SHA + FILES_TOUCHED; the fix (line ranges); emitted-
output verification; suite results + within-node delta + which failable-via-`function` fixtures
cleared + how many of the 31 files the root touches; maps feedback; deferred/scope-expansions.
DO NOT commit to main / push / clean the worktree — PA lands via S67 file-delta after independent
verification + user commit-auth.
