# Progress: s144-input-state-read-path (6nz Bug AC — §36 input-state read emits unbound ident)

- Start at PWD: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a883fce02cc1ba77b
- HEAD at start: 505f4ace (v0.7.0)
- Bug confirmed: `${<#cursor>.x}` in markup → `el.textContent = _scrml_input_cursor_.x;` (unbound) → ReferenceError.
- Root cause: ast-builder.js:362 preprocessWorkerAndStateRefs() (TAB, OUT of scope) lowers standalone
  `<#name>` → bare `_scrml_input_<name>_` BEFORE codegen, so CG rewriteInputStateRefs (rewrite.ts, Pass 7)
  never sees `<#name>` and the bare ident is never bound.
- Fix strategy (IN scope): extend rewriteInputStateRefs (rewrite.ts) to ALSO recognize the already-lowered
  bare form `_scrml_input_<id>_` and rewrite to `_scrml_input_state_registry.get("<id>")`, with a negative
  lookahead excluding runtime helper kinds (mouse/keyboard/gamepad/state + create/destroy/registry).
- Reactivity secondary: SPEC §36.6 (line 17495-17498) is normative — "no reactive subscriptions are set up.
  This is intentional." Direct `${<#cursor>.x}`-in-markup reactivity is OUT of spec/scope. Fix only the
  hard ReferenceError.

## Resolution (S144 Cluster F)

- FIX commit 7a49416f (3 CG files, all in scope):
  - emit-expr.ts emitIdent: recover bare `_scrml_input_<id>_` IdentExpr -> registry.get("<id>").
  - rewrite.ts rewriteInputStateRefs: also fold the bare lowered form (string-pipeline parity).
  - emit-reactive-wiring.ts: extend file-scope pure-read orphan suppression to the registry-get
    read shape (prevents a NEW file-scope TypeError — read would run before _create registers).
- TEST commit c1f5d6d4: compiler/tests/integration/input-state-read-path-bug-ac.test.js (5 tests:
  3 emit + 2 happy-dom). Verified true gate — reverting fix fails 3 incl. the exact ReferenceError.
- R26: `${<#cursor>.x}` now emits `el.textContent = _scrml_input_state_registry.get("cursor").x;`.
  Canonical input-canvas-demo whole §36 surface resolves through registry; node --check OK.
- Full suite: 15204 pass / 0 fail (+5). Input-state subset: 92 pass / 0 fail.

### Reactivity secondary finding (PA design call)
SPEC §36.6 (line 17495-17498) NORMATIVE: input-state reads set up NO reactive subscription —
intentional; canonical path is reads inside `animationFrame` callbacks. Therefore direct
`${<#cursor>.x}`-in-markup is NOT reactive (the one-shot DOMContentLoaded write does not re-fire
on later mousemove). RECOMMENDATION: OUT of scope for this fix. The hard ReferenceError (the
actual bug) is closed. If markup-interp reactivity for input state is desired, it would require
reactive-getter plumbing in runtime-template (mouse/keyboard/gamepad state behind `_scrml_reactive`
deps) — a separate design decision, NOT a defect. Flagged for PA.

### Out-of-scope collision note
Root cause origin is ast-builder.js:362 `preprocessWorkerAndStateRefs` (TAB stage, OUT of file
fence — owned by parallel dispatches). Did NOT edit it. The CG-side recovery is the correct
in-fence fix and makes registration/read names agree regardless of which upstream path
(ast-builder markup path OR tokenizer.ts:710 attr path) produced the bare form.
