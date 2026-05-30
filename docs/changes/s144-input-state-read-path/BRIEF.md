# BRIEF — S144 Cluster F (6nz Bug AC, HIGH)
agent: a883fce02cc1ba77b · scrml-dev-pipeline · isolation:worktree · model:opus · dispatched S144 2026-05-30 on HEAD 505f4ace.
discipline: standard S126/S99/S88/S83/S90/R26 verbatim per pa.md.

BUG: §36 input-state `<#id>` reads emit unbound identifier `_scrml_input_<id>_` → ReferenceError; whole keyboard/mouse surface runtime-dead; canonical sample samples/compilation-tests/input-canvas-demo.scrml itself broken. exit-0 + node-check-clean + runtime ReferenceError (Bug-51-class).
EVIDENCE: registration `_scrml_input_mouse_create("cursor",...)` → registry.set("cursor"); read emits `el.textContent = _scrml_input_cursor_.x` (never bound). Names disagree.
LEADS: correct read forms EXIST at emit-expr.ts:1457 (`_scrml_input_state_registry.get("name")`) + rewrite.ts:518; markup-interp read path (`${<#id>.member}`) emits the wrong `_scrml_input_<id>_` name instead — likely emit-reactive-wiring.ts / markup `${}` binding emitter. Fix: route `<#id>` read through registry.get (or emit one `const _scrml_input_<id>_ = registry.get("<id>")` binding); make registration + read names agree. Also fix canonical sample.
SECONDARY (report, likely out-of-scope): `${<#cursor>.x}` may be non-reactive even after binding fix (getters not _scrml_reactive-backed; §36.6 canonical pattern drives reads from animationFrame tick). Don't build reactive plumbing; report finding for PA design call.
SCOPE-FENCE: emit-expr.ts, rewrite.ts, emit-reactive-wiring.ts, runtime-template.js + sample + tests. NOT the sibling-owned files.
ACCEPTANCE: happy-dom test (mousemove/keydown asserts coord + pressed); min emit test registry.get form. Pre-commit gate.
