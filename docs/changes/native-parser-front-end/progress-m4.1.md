# M4.1 progress — async / generator (await/yield operators, function*)

Per-agent progress file (a parallel M1.x-cluster dispatch runs — per-agent filename).
Append-only, timestamped.

## 2026-05-20 — startup + research complete

- Startup verification PASS. Worktree
  `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ac51cc22f09910674`;
  `git merge main` → HEAD `44563a1c`. All 8 predecessor files present
  (parse-expr / parse-stmt / parse-mode / ast-expr — `.scrml` + `.js`).
  `bun install` + `bun run pretest` clean.
- Read maps (primary; routing → schema/structure/dependencies), roadmap §0 + §3.4
  (the M4.1 row is the authoritative scope), S98 DD D3/D5/D7, charter Q4.A/Q4.B,
  predecessor progress files (m2.4 / m3.2 / m3.3), and all 8 predecessor
  native-parser files in full.
- SPEC read per pa.md Rule 4: §13.1-§13.5 (async model), §37.1-§37.5
  (`server function*` SSE generators). Kickstarter §2 (the auto-await rule).

### Key SPEC / Acorn findings (load-bearing — override any brief paraphrase)

- **§13.1** — the developer SHALL NOT write `async` / `await` in scrml source.
  Kickstarter §2 reinforces: `await`/`async` are forbidden across the ENTIRE
  scrml source surface. BUT this is a LATER-STAGE diagnostic (typer/checker),
  exactly like try/catch rejection — NOT a parser concern. D5 line 481 lists
  `async`/`await` as plain MUST PARSE (legacy + JS imports + the Acorn
  `allowAwaitOutsideFunction:true` flag). M4.1's parser parses them as JS;
  it does NOT enforce §13.1.
- **§37** — `server function* name() {}`, `yield`, `yield*`, and `for await...of`
  ARE canonical scrml source (SSE). The `*` immediately follows `function`,
  no whitespace required. `yield` outside a generator is E-SSE-001 — a
  SEMANTIC check, not a parse error (it parses; a later stage rejects).
- **Acorn scope semantics** (probed directly — the conformance oracle):
  - `await` is UNARY-precedence (`await a + b` → `Binary(Await(a), +, b)`;
    `await a ** b` is a SyntaxError — `await`, like a unary op, cannot be the
    un-parenthesized left of `**`).
  - `yield` is ASSIGNMENT-precedence — lowest, BELOW conditional `?:`
    (`yield a ? b : c` → `Yield(Conditional)`; `x = yield a` →
    `Assignment(x, Yield)`). A bare `yield` (no argument) is a valid operand
    (`a + yield` → `Binary(a, +, Yield(null))`).
  - Every function / arrow RESETS scope. A plain (non-async) arrow inside an
    async function CANNOT use `await`; a plain function inside an async
    function CANNOT use `await`; a non-generator inside a generator cannot
    `yield`. Arrows are never generators (no `*`). An `async function*` sets
    BOTH flags. ⇒ a save-set-restore at every function/arrow entry, NOT
    propagation.
  - The conformance `ACORN_OPTS` is `{ecmaVersion:2025, sourceType:"module"}`
    — NO `allowAwaitOutsideFunction`. So top-level `await`/`yield` are Acorn
    SyntaxErrors; the Acorn-comparable corpus keeps them INSIDE async/gen
    bodies, and top-level `await`/`yield` go in native-shape tests (the same
    pattern M3.3 used).

### Design — scope mechanism

Async/generator scope is two boolean slots `inAsync` / `inGenerator` on the
shared parse-context object — NOT a `ParseMode` engine variant. Justification
(Pillar 5b / DD §D3): `ParseMode` distinguishes WHICH grammar production runs
(object-vs-block ambiguity, etc.); async/generator scope is "is `await`/`yield`
a legal operator here." Folding into `ParseMode` forces a combinatorial
cross-product (`InFunctionBody` × {sync, async, gen, async-gen}) — the variant
explosion D3 explicitly rejects. The slot mirrors M3.4's `functionDepth`
pattern: a function-scoped slot saved+set+restored at function entry/exit.

## Plan — commit per logical unit

1. ast-expr.{scrml,js} — `Await`/`Yield` ExprKind + `makeAwait`/`makeYield`;
   `isGenerator` on `makeFunction`.
2. parse-mode.{scrml,js} — header note: async/gen scope is NOT an engine
   variant (no code change).
3. parse-expr.{scrml,js} — `inAsync`/`inGenerator` ctx slots; `await` in
   parseUnary; `yield`/`yield*` in parseAssignmentExpr; function-expr +
   arrow scope save-set-restore + `isGenerator` wiring.
4. parse-stmt.{scrml,js} — ctx slots; function-decl + body-inline + class-
   method scope save-set-restore; parseBlockStubBody + reenterBlockStubs
   scope threading; statement-position await/yield delegate to the
   expression grammar; drop the local makeAwaitExpr/makeYieldExpr.
5. parser-conformance-stmt.test.js — M4.1 async/generator corpus + native-
   shape tests (Tier 1+2 Acorn-oracle).

## 2026-05-20 — Steps 1+3 landed

- DONE — ast-expr.{scrml,js} + parse-expr.{scrml,js} committed together as
  ONE logical unit (`makeFunction` arity change couples them — committing
  separately leaves a transient-red window). Commit `15c631d6`.
  - ast-expr: `Await`/`Yield` ExprKind + `makeAwait`/`makeYield`;
    `isGenerator` on `makeFunction`.
  - parse-expr: `inAsync`/`inGenerator` ctx slots + `enterFunctionScope`/
    `exitFunctionScope` save-set-restore; `await` in `parseUnary` (unary
    prec, `E-EXPR-UNARY-EXPONENT` for `await a**b`); `yield`/`yield*` in
    `parseAssignmentExpr` (`parseYieldExpr` + `yieldArgFollows` — ECMA-262
    no-LineTerminator restricted production; `E-EXPR-YIELD-STAR-NO-ARG`);
    `function*` expr + `*`/`async *` object-method generator wiring.
- Acorn probes captured the precise scope rules: `await` unary-prec,
  `yield` assignment-prec; every function/arrow RESETS scope (a plain
  arrow/fn nested in async cannot `await`); `await`/`yield` in a param
  default are SyntaxErrors so scope is set around the BODY only.
- Verify: expr-conformance 578/0; stmt/markup/lexer 1011/0 — zero regression.
- Path-discipline hook fired ONCE (an Edit inherited a main-rooted path
  from an earlier Read) — corrected immediately to the worktree path; no
  leak reached main.

## Step 4 plan — parse-stmt

- `makeParseStmtContext` + `parseBlockStubBody` gain `inAsync`/`inGenerator`.
- `parseFunctionBodyInline` save-set-restore (mirrors its `functionDepth`
  inc/dec) — but it needs the function's own (isAsync, isGenerator), so
  `parseFunctionDecl` / class-method parsing pass them in.
- `reenterBlockStubs` threads each Function/Arrow node's isAsync/isGenerator
  into the re-entered body context.
- statement-position `await`/`yield` (M3.3's `parseAwaitStatement`/
  `parseYieldStatement`) — route through `parseExprStatement` so the
  expression grammar's `await`/`yield` path is the single implementation.
- drop the local `makeAwaitExpr`/`makeYieldExpr` (use ast-expr's).

## 2026-05-21 — Steps 2+4+5 landed — M4.1 COMPLETE

- DONE — parse-stmt.{scrml,js} + parse-mode.{scrml,js} committed as ONE
  logical unit. Commit `8d397bc8`.
  - `makeParseStmtContext` + `parseBlockStubBody` gain `inAsync`/`inGenerator`.
  - `parseFunctionBodyInline(ctx, isAsync, isGenerator)` save-set-restores
    the scope around the body (the `functionDepth`-pattern shape); the two
    callers (`parseFunctionDecl`, class-method) pass the function's flags.
  - `reenterBlockStubs(node, asyncScope, genScope)` — scope-aware walk: a
    `Function`/`Arrow` node's `body` BlockStub re-enters in the function's
    OWN scope; non-body children (param defaults) reset; bare BlockStubs
    use the passed-through scope.
  - DELETED M3.3's `parseAwaitStatement`/`parseYieldStatement` +
    `makeAwaitExpr`/`makeYieldExpr`; the `parseStatement` `KwAwait`/`KwYield`
    branches removed — `parseExprStatement` covers them via the unified
    expression grammar. (This also fixes M3.3's `await` operand: it used
    `parsePostfix` — `await -x` needs the `parseUnary` operand.)
  - parse-mode: header note only — async/gen scope is deliberately NOT a
    ParseMode variant. No code change.
- DONE — parser-conformance-stmt.test.js: M4.1 coverage. Commit `121dbd84`.
  - `M4_1_CORPUS` (42 entries) — Acorn-oracle Tier 1+2.
  - native AST-shape block (17 tests) + scope-boundary block (7 tests).
  - `nativeExprToEstree` Await/Yield branches keyed on `ExprKind.Await`/
    `ExprKind.Yield`.
- VERIFY — full `bun run test`: 17,812 pass / 0 fail / 169 skip / 1 todo
  (baseline `44563a1c` 17,706/0/169/1 — exactly +106 M4.1 tests, ZERO new
  failures, ZERO regressions). Pre-commit gate (unit+integration+
  conformance): 13,362/0. All 4 parser-conformance suites 1695/0.

## M4.1 COMPLETE — deferred items + M4.2/M4.3 seams

- M4.2 (next): K6 — `parseParamTarget`'s literal-stand-in destructuring
  params → real `ObjectPattern`/`ArrayPattern` binding nodes (unify with
  M3.1's vardecl binding patterns); the for-head `noIn` flag threaded into
  M2's binary climber (M3.2's deferral). M4.1 did NOT touch either —
  destructuring params are still the K6 literal stand-in; the for-head
  disambiguator is still M3.2's depth-0 scan.
- M4.3: full-corpus conformance (every `.scrml` in samples/examples/stdlib/
  self-host) + Tier 3 (spans) + Tier 4; residual D5 gaps; the
  `preprocessForAcorn`-not-needed demonstration.
- Top-level `await` (module-scope, no enclosing function): the conformance
  `ACORN_OPTS` does NOT pass `allowAwaitOutsideFunction`, so top-level
  `await` is an Acorn SyntaxError and the native parser (with `inAsync`
  false at program scope) likewise rejects it — consistent. The live
  compiler uses `allowAwaitOutsideFunction: true`; if M4.3's full-corpus
  pass surfaces a top-level-await `.scrml`, M4.3 decides whether to seed
  `inAsync` true at program scope. M4.1 left it false (the conservative,
  Acorn-conformance-matching default). Surfaced for M4.3.
- `for await` outside an async scope: M3.2 parses `for await` structurally
  (the `isAwait` flag) with no scope-legality check. Acorn rejects `for
  await` outside async; M4.1 did NOT add that check (M3.2's `for await`
  parsing is structurally complete and the scope-legality of `for await`
  is a thin follow-on). Non-blocking; note for M4.3's conformance close.
