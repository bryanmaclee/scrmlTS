# Server-Load Request-Context Authority build (SSR Forks 3+4). Change-id: server-load-authority-2026-06-30
# Agent: scrml-js-codegen-engineer · isolation:worktree · bg · agentId a72f1f2631c2b914e · S233 2026-06-30 · base e72f058a

V1-security-critical: closes a CONFIRMED hole (anon POST /__serverLoad/<protectedVar> returns all rows). Design fully RATIFIED S233 (server-load-request-context-authority deep-dive + the Forks 1-5 + ambient-identity ratifications).

## RATIFIED design (not re-litigated):
- @currentUser = compiler-provided AMBIENT identity cell from the session middleware. .id : string|not, .role : string|not, .isAuth : bool. V5-strict; `not` for anon. SERVER-side this build (gate + row-scope); client-UI-gating OUT (deferred per-role/GITI-027B arc).
- Fork 4 route gate (4a-floor + 4c): /__serverLoad handler enforces the enclosing <page>/<program auth=> requirement, co-located IN the handler, default-inherit, 401 JSON (not 302). Per-var auth= = 4c.
- Fork 3 row-scope: server-authority ?{} may reach @currentUser.id (Tier-2 Pattern-C): `<orders server> = ?{ select * from orders where user_id = ${@currentUser.id} }.all()`. Anon → @currentUser.id is not → SQL NULL → zero rows (fail-closed). No new scope=/where= keyword.

## Components (fire-sites per the dive):
1. @currentUser ambient cell — register in type-system as a server-context cell (3-field shape); resolvable in server-fn bodies + synthetic serverLoad handlers.
2. Complete _scrml_session_middleware (returns {sessionId,isAuth} today → resolve userId+role; impl-gap #2).
3. Route gate (Fork 4): emit-server.ts /__serverLoad handler (~2836-2922; takes _scrml_req, never gates today) → call _scrml_auth_check/_scrml_session_middleware (~1278-1295), default-inherit, 401 JSON; wire per-var auth= (4c); inject @currentUser (impl-gap #1).
4. Row-scope (Fork 3): thread @currentUser into the server-authority ?{} lowering.
5. 2 NEW diagnostics NAMED (PA authors §34 at landing): W-SERVERLOAD-UNGATED (Fork-4 footgun) + W-SSR-PRERENDER-UNSCOPED (per-var, sibling of W-AUTH-002 — per-user cell SSR-prerendered unscoped = cross-user leak; public cells don't fire).

## SECURITY invariants: 3 axes STACK none substitutes (route-admission F4 ⟂ row-selection F3 ⟂ §14.8.9 column-redaction[reuse, don't touch]). Fail-closed everywhere (anon→zero-rows+401; unknown→deny).
## SPEC: PA authors at landing (single-writer); agent reports SPEC-delta + NAMES codes + registers @currentUser type; no SPEC.md hand-edit.
## Protocol: MAPS · F4/S112-merge-main/S99/S126 · TESTS (anon→401, scoped rows, stacking) · R26 (protected per-user table under <page auth=required>) · S198 full `bun run test` gate. Report: SPEC-DELTA list + R26 greps + suite counts + confirm hole-CLOSED.
