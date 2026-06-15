# corpus-16-remote-data-2026-06-15 — progress

Wave-1a corpus rewrite. Make `examples/16-remote-data.scrml` the canonical
ASYNC-LOADING-AS-A-PHASE example via the Tier-1 STRUCTURAL `<match for=Phase>`.

## 2026-06-15 — start
- Startup verification clean: pwd under worktrees/agent-aba42e0efe6a1cdb8,
  toplevel matches, tree clean, HEAD cd822f7a, bun install + pretest OK.
- Read maps (primary.map.md), kickstarter v2 §11.5/§11.1/§11.10/§7/§6.8,
  primer §6.2/§6.3/§19, SPEC §18.0.1/§5.2, current example file.

## 2026-06-15 — rewrite drafted
- Typed `Contact:struct` + `ContactsError:enum` + `ContactsPhase:enum`
  ({ Idle, Loading, Loaded(rows: Contact[]), Failed(message: string) }).
- `<phase>: ContactsPhase = .Idle`.
- Replaced the inline `${ match @state {...lift...} }` anti-pattern with the
  Tier-1 structural `<match for=ContactsPhase on=@phase>` block + bare-variant
  arm tags `<Idle> <Loading> <Loaded rows> <Failed message>`.
- Replaced nested `${for/lift}` rows with Tier-1 `<each in=rows key=@.id>` +
  `<empty>` (folds the zero-rows case; dropped a separate Empty variant).
- Made the fetch failable (`function fetchContacts() ! ContactsError`) and
  wired the call-site `!{}` to route the failure INTO `.Failed` (errors-as-
  states, G2). The `.Failed` arm is now reachable, not a dead branch.
- Rewrote the header comment to frame the lesson + the Tier ladder.

## 2026-06-15 — compile-verify wrinkles found + fixed
- WRINKLE 1: brief said "drop the redundant `${...}` wrapper" — that applies to
  `<program>` TOP-LEVEL only. Bare type/cell/function decls INSIDE `<db>` break
  the block-splitter (E-CTX-001/E-CTX-003); the `${...}` logic block is
  load-bearing there. Restored the wrapper around the decls inside `<db>`.
- WRINKLE 2: the match container closes with `</match>`, NOT `</>` (canonical
  per samples/compilation-tests/match-002). Fixed the match closer.
- WRINKLE 3 (PARSER BUG): an HTML comment `<!-- ... <each> ... <empty> ... -->`
  INSIDE a match arm body fires E-MATCH-PARSE-001 (arm has no matching closer) +
  E-MATCH-NOT-EXHAUSTIVE. The arm-body raw scanner counts angle-bracket tag
  mentions inside the comment. Worked around by removing angle brackets from the
  in-arm comment. Minimal repro (Test D) saved in report. Surfaced to PA.

## 2026-06-15 — acceptance gate PASS
- compile exit 0, 0 E- errors. Only W-TAILWIND-UNRECOGNIZED-CLASS (backed by
  #{} rules, expected) + W-PROGRAM-SPA-INFERRED (expected).
- node --check client + server: both OK.
- grep: zero `${ match` inline-match-lift, zero `${ for` row-renders, zero
  null/undefined/try/throw/===/!==, zero NotAsked.
- Server-only SQL stays on server (`_scrml_sql` in server.js); NO leak in
  client.js. fetchContacts routes to a client fetch stub.
- `.Failed` arm LIVE: `_scrml_load_6` sets `{ variant: "Failed", ... }` on the
  `!{}` error path; the dispatcher mounts `_scrml_match_match_75_render_Failed`.
