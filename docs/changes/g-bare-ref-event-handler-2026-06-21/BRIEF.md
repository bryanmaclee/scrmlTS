# Fix: g-bare-ref-event-handler-emits-literal-not-wired (MED) — change-id g-bare-ref-event-handler-2026-06-21
Dispatched S212 2026-06-21 · scrml-js-codegen-engineer · isolation:worktree · opus · agent abab18f300e83efc1 · base session-start 6d8a47ab → merge origin/main 09cc6b21 (S112)

Root: the event-binding collector recognizes the call form (fn()) + ${} expr form but NOT the bare-ref ATTRIBUTE
form on<event>=<bareIdent> → falls through to literal attr emission (emit-html) → onclick="bump" (dead; bump is
module-scoped _scrml_bump_N not a global). §5.2.2 row 5 NORMATIVE: onclick=handler SHALL wire handler directly as
listener (no auto-wrap) → conformance BUG, fix-to-wire. NB emit-event-wiring.ts:534 bare-ident is the ${advance}
EXPR path (appends () to invoke), DIFFERENT. FIX: recognize on<event>=<bareIdent> in the binding collector + wire
the resolved _scrml_<name>_N directly as listener (data-scrml-bind-on* + DELEGABLE_EVENTS path), passing event,
NO auto-wrap. R26: emit-grep bare-ref div now data-scrml-bind-onclick not literal + happy-dom click fires handler;
call/expr forms no-regress. FULL bun run test. Full mandatory-block brief in transcript. PA lands S67.
