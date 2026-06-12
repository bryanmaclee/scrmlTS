# progress — payload-binding-gaps-2026-06-11

## 2026-06-11 — startup + trace
- Startup verification PASS: worktree root confirmed, status clean, bun install + pretest OK.
- HEAD cf954570. Maps read (primary.map.md). SCOPE.md read from MAIN (not yet in worktree base) — both gaps RATIFIED.
- Both reproducers compiled on baseline: Gap 1 fires E-SCOPE-001 on `field`+`detail`; Gap 2 fires E-SCOPE-001 on `count`. CONFIRMED.

### Gap 1 trace (typer)
- ast-builder.js: BOTH `!{}` arm-parse paths (pipe form ~11673, no-pipe form ~11763) set `binding = _bindNames.join(", ")` for paren `::V(a,b)` → comma-joined string.
- typer type-system.ts:9282-9284 binds `arm.binding` as a SINGLE scope name → individual `a`/`b` never resolve.
- FIX: split `arm.binding` on `,`, bind each. Typer-only. Codegen for `!{}` already splits (parseBindingList). VERIFY codegen unaffected.

### Gap 2 trace (typer + CODEGEN COMPANION NEEDED)
- E-SCOPE-001 fires from bare-expr case (type-system.ts:8900) reached via match-block DEFAULT recursion (type-system.ts:10165-10178). The match-block arm bodies walk with NO arm scope + NO payload bindings.
- Reference WORKING path: engine-decl case (10076) pushes `engine-arm:` scope + binds via extractEngineStateChildPayloadBindings (attrs, positional). JS-style match-arm-block (9578-9601) binds payloadBindings array.
- Block-form `<Done count>` / `<Conflict field detail>`: SPACE-form bindings land in `entry.attrs` (bareword attrs), NOT payloadBindingsRaw (paren-only).
- **CODEGEN FINDING (contradicts brief's "codegen already splits correctly"):** emit-match.ts:624-632 reads ONLY `payloadBindingsRaw` (paren form). For the SPACE form the arm render/wire fns get NO payload param and the body references a FREE `count` var (ReferenceError at runtime). The PAREN form `<Done(count)>` codegen IS correct. So a CODEGEN COMPANION is required to make the space form emit payload params (mirror the paren split, reading bareword attrs, filtering reserved rule/effect).
- FIX (typer): bind both paren (`payloadBindingsRaw`) + space (`attrs` barewords, reserved-filtered) into the match-block arm-body scope.
- FIX (codegen companion): emit-match.ts — feed space-form bareword attrs into `payloadBindings` (same array codegen already uses for param emission), reserved-filtered.

## 2026-06-11 — Gap 1 landed + Gap 2 implemented
- Gap 1 typer fix committed (88f31872) + 5 unit tests (75f17d9c). Reproducer clean; single/paren/3-field all bind; emit destructures each field; node-check OK.
- Gap 2 TYPER: added `case "match-block"` (type-system.ts ~10253) — walks `armBodyChildren` per-arm wrapper, pushes `match-arm:` scope, injects payload bindings (helper extractMatchArmPayloadBindingsByVariant: paren payloadBindingsRaw + space bareword attrs, reserved rule/effect filtered). Imported parseMatchArms statically.
- Gap 2 CODEGEN COMPANION (REQUIRED — brief's "codegen already splits" was paren-only): emit-match.ts:624 now ALSO reads space-form bareword attrs into payloadBindings (reserved-filtered). Before: space form emitted render/wire fns with NO payload param + a FREE `count` var (ReferenceError). After: space form codegen IDENTICAL to paren form (param + `_data["count"]` passed).
- R26: gap2 `<Done count>` bare-body clean + node-check OK; multi `<Conflict field detail>` binds both positionally + node-check OK; existing match-002 sample + match-block phase2-5 + emit-match + type-system + substate tests all green; the 4 "failing" match samples are pre-existing error-fixtures (identical errors on baseline, stash-verified).
- DEFERRAL: `:`-shorthand block-form `<Done count> : "got ${count}"` — typer never scope-walked it (no E-SCOPE-001 pre-fix) AND codegen emits the body LITERALLY (`${count}` not interpolated). Separate pre-existing shorthand-interpolation gap, OUT OF SCOPE (Gap 2 reproducer is bare-body). Surfaced for PA.

## 2026-06-11 — DONE
- Gap 2 fix (4ad98cf3) + 6 tests (3fdbb688) landed.
- Pre-commit gate (unit+integration+conformance): 16672 pass / 0 fail (+11 new tests, baseline 16661). Zero new failures.
- R26 forward: gap1 ::Conflict(field,detail) = 0 E-SCOPE-001 + node-check OK; gap2 <Done count> + <Conflict field detail> = 0 E-SCOPE-001 + node-check OK.
- R26 working-path regression (all clean + node-check OK): single-field !{} ::Network msg; JS-style match multi .Two(a,b); engine state-child multi <Active host port>.
- Main working tree clean — no leaked writes (type-system.ts/emit-match.ts diff-stat empty in main; S99 self-check pass).
- FILES: compiler/src/type-system.ts (Gap 1 comma-split + Gap 2 case match-block + helper + import), compiler/src/codegen/emit-match.ts (Gap 2 codegen companion: space-form bareword attrs -> payloadBindings), 2 new unit test files.
- CODEGEN COMPANION was REQUIRED (brief's "codegen already splits" was paren-only). DEFERRAL: `:`-shorthand block-form interpolation (`<Done count> : "${count}"` emits body literally, separate pre-existing gap, out of scope).
