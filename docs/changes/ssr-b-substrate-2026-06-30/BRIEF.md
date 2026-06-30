# SSR Dispatch 1 — B-substrate (inline-state seed). Change-id: ssr-b-substrate-2026-06-30
# Agent: scrml-js-codegen-engineer · isolation: worktree · background · agentId a0ca311aa926db22b · dispatched S233 2026-06-30

Builds the B-substrate: server-side request-time injection of server-authoritative cell values as inline
`<script>window.__scrml_ssr_state={…}</script>`, a client seed-before-mount hook, and conditional `/__serverLoad`
fetch IIFEs. Bounded (~15-25h); independently valuable (kills mount-fetch RTT; lights up engine server=@cell ride);
the substrate the A-terminus builds on. Does NOT close g-tier1-ssr-prerender; does NOT retire W-AUTH-002.

## Protocol blocks in the brief (verbatim text dispatched):
- MAPS — REQUIRED FIRST READ (primary.map.md; watermark 04e7a1bb / live HEAD e7455a68 source-identical).
- CRITICAL STARTUP VERIFICATION + PATH DISCIPLINE (F4/S88/S90/S99/S126): pwd-prefix check; git rev-parse toplevel;
  S112 `git merge main` at startup; git status clean; bun install; bun run pretest. Bash-edits on worktree-absolute
  paths (no Edit/Write tool, no cd into main); first-commit echoes pwd; incremental commits + progress.md.
- AUTHORITY READS: the SSR deep-dive ssr-prerender-step0-rulings-2026-06-30.md §4/§1.2/§2.3; SPEC §52.7/§52.8 + §14.8.9.

## THE BUILD (5 fire-sites; verify against current source, depth-of-survey discount, report corrections):
1. emit-server.ts (generateServerJs ~2836-2922): request-time HTML-composition path — run the same server-authority
   queries /__serverLoad runs (reuse query logic + _scrml_protect_tag→_scrml_protect_redact sink ~2857-2864); inject
   <script>window.__scrml_ssr_state={…}</script> before </head>. First compiler-emitted text/html response.
2. runtime (dist/scrml-runtime.js / runtime-template.js, _scrml_reactive_set ~730): seed-from-window.__scrml_ssr_state
   BEFORE mount → construction-resolved; satisfies _scrml_engine_hydrate_init ~3864 (engine server=@cell ride hydrates
   at construction, not via post-mount fetch).
3. emit-sync.ts (emitServerAuthorityLoad:104, emitDeclRhsSqlLoad:152, emitUnifiedMountHydrate:205): make fetch IIFE
   CONDITIONAL — skip the POST when the cell is seeded from inline state; byte-identical when no SSR state.
4. collect.ts (collectServerAuthorityTypes / collectServerVarDecls:555): reuse as-is.
5. Parity (one unified pass, §52.7): Tier-1 SELECT *, Tier-2 Pattern-C inline ?{}, derived (pre-render iff all sources
   server-authoritative §52.8).

## AUTH/PROTECT (Ruling 3): inline-state egress = client egress → SHALL apply §14.8.9 column redaction (reuse the
existing tag/redact sink). Per-role subtree gating DEFERRED (cite GITI-027B Option D). W-AUTH-002 keeps firing.

## TESTS: inline script present pre-</head>; protect= column redacted in it; fetch IIFE skipped for seeded cell;
engine ride hydrates at construction; non-server-authority/non-protect page byte-identical. Tier-1/Tier-2/derived.

## R26 (S138, MANDATORY): real .scrml repro (Tier-1+protect= / Tier-2 ?{} / derived / engine server=@cell ride);
compile; verify inline __scrml_ssr_state present + protected col redacted + fetch skipped + node --check clean.

## GATE (S198): full `bun run test`; re-baseline within-node allowlist in-same-landing if OVER-BUDGET; never --no-verify.

## REPORT: WORKTREE_PATH·FINAL_SHA·FILES_TOUCHED·R26 greps·full-suite counts·allowlist deltas·deferred·maps line·
fire-site corrections·confirm W-AUTH-002 NOT retired + g-tier1-ssr-prerender does NOT close.
