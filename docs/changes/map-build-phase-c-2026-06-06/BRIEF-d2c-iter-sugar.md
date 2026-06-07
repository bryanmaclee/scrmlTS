# MAP BUILD — PHASE C — DISPATCH D2c: `<each … as (k, v)>` iteration-destructure sugar (§59.8)

(Verbatim archive of the dispatch prompt, per S136. The optional terse iteration form; the `as e` + `e.key`/`e.value` baseline already works.)

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full. Maps reflect `4c8063b6`; source current (D1–D4 + currency landed — your base after merge-startup). Report `Maps consulted: …; load-bearing finding: …`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`. 3. **`git -C "$WORKTREE_ROOT" merge main` (S112)** (inherit D1–D4). Conflicts → STOP. 4. clean. 5. `bun install`. 6. `bun run pretest`.
**Path discipline (S99/S126):** edits via Bash on worktree-absolute paths; NEVER `cd` into main. First commit `WIP(d2c): start at <pwd>`. ⚠ COMMIT TINY + OFTEN (watchdog).

# TASK — the optional `as (k, v)` positional destructure on `<each>` (§59.8, S169 ruling)
Read SPEC §59.8 IN FULL (the iteration section, as amended S169) FIRST (Rule 4). The S169 ruling: map-entry iteration rides the shipped `<each in=@m.entries() as e>` opener + `e.key`/`e.value` (THIS ALREADY WORKS — `.entries()` returns `[{key, value}]` structs from D3, `as e` is shipped, struct field access is shipped — do NOT touch that). D2c adds ONLY the optional terse form:

```scrml
<each in=@fareByLane.entries() as (k, v)>   // k = e.key, v = e.value
    <li>${k}: ${v}</li>
</each>
```

`as (name1, name2)` binds the iteration value's **entry-struct fields positionally** (§59.8 / §14.11): `name1 ← .key`, `name2 ← .value`. It is sugar over `as e` + `e.key`/`e.value` — the iterated value remains the `{key, value}` struct.

## Scope
1. **Parse `as (name, name)` — BOTH paths.** Today the `<each>` opener captures a SINGLE identifier after `as`:
   - LEGACY: `compiler/src/ast-builder.js` ~12097 — `readAsName` / the `/\bas\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/` capture. Extend to ALSO accept `as ( name1 , name2 )` (parenthesized, comma-separated 2 names) → capture both names (store as e.g. `asNames: string[]` alongside / instead of the single `asName`).
   - NATIVE: `compiler/native-parser/parse-file.js` ~967 — `readAsName` / `synthEachBlockNode`. Same extension.
   - Keep the single-name `as e` form working unchanged (most common). The 2-name form is additive.
2. **Codegen — bind the 2 names per-item.** Find where the each per-item binding emits the `as name` → the item value (likely `compiler/src/codegen/emit-each.ts`, the per-item render fn). When the each carries 2 `as` names `(a, b)`, emit per-item bindings **`const a = <item>.key; const b = <item>.value;`** (the entry-struct's fixed fields — §59.8 scopes this to the `.entries()` entry shape `{key, value}`). The body then references `a`/`b` directly. (This is the §59.8 entries-destructure; a fully-general §14.11 N-field positional destructure on arbitrary struct arrays is OUT of scope — scope to the 2-name `.key`/`.value` entry case + note it.)
3. Both names are local bindings (no `@` sigil — like `as e`). `${a}` / `${a.foo}` work as ordinary locals.

## VERIFICATION (before DONE)
1. Full `bun run test` — baseline ~**23,285/0** (confirm via `bun run test` FIRST). ZERO regressions.
2. NEW tests: `<each in=@m.entries() as (k, v)>` parses (both paths) → 2 bound names; codegen emits `const k = item.key; const v = item.value;` (or equivalent); the body `${k}: ${v}` produces the same output as the `as e` + `e.key`/`e.value` baseline (byte-identical or equivalent). Single-name `as e` still works.
3. **R26 END-TO-END:** a real `.scrml` with `<each in=@m.entries() as (k, v)>` compiles (exit 0), `node --check` clean, and at runtime k/v bind correctly (a happy-dom or node check: iterate a 2-entry map, assert both k and v render). The `as e` baseline equivalence is the correctness anchor.
4. within-node parity 1005/0 (+ the D2b map sample if it landed — confirm no regression).

## DEFER (NOT this dispatch)
- General §14.11 N-field positional destructure on arbitrary struct arrays (scope to the 2-name entries `.key`/`.value` case).
- Native map literal (D2b — concurrent dispatch; do NOT touch `parseArrayLiteral` / `ast-expr.js`).

## COMMIT DISCIPLINE (S83): commit per unit (legacy parse; native parse; codegen bind; tests); `git status` clean before DONE; update `progress-d2c.md`.

## REPORT (raw structured text)
`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · merge-startup · full-suite + within-node counts · per-piece status (legacy-parse / native-parse / codegen / tests) · the R26 end-to-end result · whether the binding is entries-scoped or generalized · deferred items · maps feedback.
