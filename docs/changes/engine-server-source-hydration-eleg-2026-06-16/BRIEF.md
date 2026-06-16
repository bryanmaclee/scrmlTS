# BRIEF — Server-authoritative engine: `<engine for=T server=@source>` (the E-leg)

**Change-id:** `engine-server-source-hydration-eleg-2026-06-16`
**Dispatched:** S198 (2026-06-16), PA → `scrml-js-codegen-engineer`, `isolation: "worktree"`.
**Task shape:** compiler-source feature (parser + SYM/typer + codegen) + a coupled SPEC §51/§52 amendment. RATIFIED design — do NOT re-litigate.

---

## WHAT YOU ARE BUILDING (one paragraph)

The F-primitive (`initial=@cell`, the A-leg) hydrates an engine to a persisted state available **at construction** (snapshot-once). But scrml's corpus loads state **after** construction — on-mount fetch / SSR / server push (§52 read-authority). The **E-leg** is the server-authoritative engine: `<engine for=DriverStatus server=@driver.current_status>` — the engine **hydrates (guard-free) from a server-owned SOURCE cell, reactively, whenever the source resolves/changes**, while **client writes remain guarded transitions**. RATIFIED S198 (user): server source HYDRATES (guard-free, it's the authority asserting truth); client moves TRANSITION (guarded by `rule=`). Surface RATIFIED: `server=@source` (a value-bearing attribute — the §52 *authority* sense of `server`, NOT the deprecated function-*placement* sense; it is a `decl-attr` in the opener, parallel to §52 Tier-2's bare `<var server>`).

## THE SETTLED MODEL (build to this — do not redesign)

- **The engine does NOT load itself.** It rides an existing server source's §52 load. `server=@source` names that source. The engine reflects it.
- **One hydrate path:** the compiler-generated subscription to `@source`. On every source change → `_scrml_engine_hydrate_init` (the F-primitive's GUARD-FREE helper, `runtime-template.js:~3841`) — bare reactive set, NOT the transition guard. `rule=` does NOT apply to a server-authority hydrate.
- **All dev writes are client transitions.** A `@cell = .X` / `.advance(.X)` in an event handler stays on `_scrml_engine_direct_set` (the `rule=` transition guard, `runtime-template.js:~3767`). The ONLY guard-free path is the source-subscription. (No write-context classification needed — the subscription is the sole hydrate.)
- **The §38 server-push composes for free:** if `@source` is updated by a §38 broadcast/push, the engine's subscription fires the same hydrate. No special path. (The MMORPG-specific §52 *write-back* / G1 is OUT OF SCOPE — that's the persist leg, separately deferred.)
- **Persist-back** is the developer's explicit `?{}` (§52.6.2 retraction, C/WF S194) — a client transition does NOT auto-persist. (An optional `W-ENGINE-SERVER-NO-PERSIST` nudge if a server-source engine has client transitions but no persist path is a NICE-TO-HAVE — skip unless trivial.)
- **`initial=.Literal`** stays as the SSR / pre-load placeholder (rendered until the source resolves; §52's SSR pre-render populates the source server-side — already built).

## THE TWO REUSE-SEAMS (PA-located — verify in Phase 0, then build)

1. **Source-subscription:** the derived engine (`derived=expr`, §51.0.J / C14 / B16) ALREADY subscribes an engine to a source + recomputes — `engineMeta.derivedExpr` carries the source; the codegen emits a subscription. BUT it is gated on `derivedExpr !== null` AND bundled with READ-ONLY enforcement (`E-DERIVED-ENGINE-NO-WRITE`, `emit-engine.ts:~3041`/`~3068`; the derived gate `if (meta.derivedExpr != null) return false` at `emit-engine.ts:~269`). The E-leg needs the SUBSCRIPTION but NOT the read-only constraint, and it HYDRATES instead of derived-recomputes.
2. **Hydrate helper:** `_scrml_engine_hydrate_init(varName, snapshot, validTags, forType)` (`runtime-template.js:~3841`) — guard-free, already built (the F-primitive). REUSE it; now wired REACTIVELY (inside the source-subscription) instead of one-shot-at-construction. No new runtime helper needed.

## PHASE 0 — SURVEY + STOP GATE (do this first; STOP if it fails)

The load-bearing risk: **can the derived-engine source-subscription mechanism be reused for a WRITABLE engine — i.e., lifted out of the `derivedExpr`-gated read-only path?** VERIFY:
1. Is the subscription wiring (subscribe-to-source-on-change) SEPARABLE from the read-only enforcement + the derived-recompute? Or is it tangled such that subscription ⟹ read-only? Quote the codegen. If separable → you reuse/mirror the subscription, routing it to `_scrml_engine_hydrate_init` instead of the derived-recompute, on a still-writable engine. If tangled → STOP, report the structure, propose either (a) a parallel subscription emitter for the server-source path, or (b) a refactor that factors subscription out of read-only.
2. Confirm `_scrml_engine_hydrate_init` is safe to call REACTIVELY (multiple times, on each source change) — it's a guard-free bare set + decoder-boundary check; should be idempotent-safe, but confirm.
3. Confirm the source-subscription (hydrate) and the dev-write path (transition guard) COEXIST on the same engine cell without conflict (the cell is writable; the subscription overwrites it guard-free on source-change; dev writes go through the guard). Confirm a dev transition between source-changes isn't clobbered incorrectly (last-write semantics: a source-change hydrate is authoritative + overwrites; that's the intended server-authority semantic — the server's word wins).
If all hold, proceed. If the subscription can't be cleanly made writable, STOP for a PA ruling.

## BUILD (phases 1-4)

1. **Parser/ast-builder + SYM:** recognize `server=@source` on the `<engine>` opener (a value-bearing attr; `@source` is a cell ref, possibly a field access `@driver.current_status`). Capture as a NEW `engineMeta.serverSource` (the source cell/field ref) — DISTINCT from `derivedExpr` (read-only) and `initialCell` (A-leg construction-snapshot). Validation: the source must resolve (exist) + be type-compatible (its value is the engine's `for=T` enum OR a `string` holding a variant name — mirror the A-leg/slice-1a `<match for=Enum on=@stringCell>` precedent). Fire a `W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE` info-lint if `@source` is NOT recognizably §52-server-authoritative (a nudge — the mechanism works regardless; the `server=` name asserts the intent; keep it lenient, info-severity — do NOT hard-gate on §52-ness if it's fragile to check). MUTUAL-EXCLUSION: `server=@source` conflicts with `derived=` (E-ENGINE-SERVER-WITH-DERIVED) — a server-source engine is not derived. `server=@source` may coexist with `initial=.Literal` (the placeholder) but NOT with `initial=@cell` (A-leg) — `E-ENGINE-SERVER-WITH-INITIAL-CELL` (pick ONE hydration model). The engine REMAINS WRITABLE (client transitions allowed — it is NOT read-only like derived).
2. **Codegen (emit-engine.ts):** emit a subscription to `@source` (reuse/mirror seam 1's subscription) that, on each source change, calls `_scrml_engine_hydrate_init("varName", <source value>, validTags, forType)` — guard-free. Dev event-handler writes stay routed through `_scrml_engine_direct_set` (the transition guard). `initial=.Literal` is the construction-time placeholder (the existing static-literal path). Ensure ordering: the subscription is wired AFTER the source cell's init (the F-primitive's emit-client ordering precedent — the hydration must read a populated source).
3. **SPEC §51 + §52 amendment:** §51 — the NEW `server=@source` server-authoritative engine form (the third form alongside plain + `derived=`; hydrate-from-source guard-free + guarded client transitions; the worked HOS example; `initial=.Literal` placeholder; the §38-push-composes note; persist-via-dev-`?{}`). §52 — the engine cell as an authority CONSUMER (`server=@source` consumes a §52-authoritative source; cross-ref §51.0.A S178 + §52.3.4 `<var server>`). §34 — the new codes (E-ENGINE-SERVER-WITH-DERIVED, E-ENGINE-SERVER-WITH-INITIAL-CELL, W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE; reuse E-ENGINE-INITIAL-INVALID-VARIANT for an out-of-enum source value at hydrate — the decoder boundary). Cite the engine-hydration DD + the F-vs-B verdict + the S198 ratification (the model + the surface). Per pa.md Rule 4, the §34 rows land in the same change.
4. **Tests + R26:** unit tests — `server=@source` recognition + serverSource capture; emits a source-subscription → `_scrml_engine_hydrate_init` (NOT `_scrml_engine_direct_set`); the engine is still writable (a client `@cell = .X` routes through the transition guard); a source-change re-hydrates guard-free (even to a non-adjacent variant); the mutual-exclusion errors; the not-authoritative info-lint. **R26 dog-food:** a `<engine for=DriverStatus server=@status>` where `@status` is a reactive cell holding a variant-name string — set `@status` (simulating a server load), confirm the engine hydrates to it guard-free (no `E-ENGINE-INVALID-TRANSITION` even for a non-adjacent variant); then a client transition routes through the guard; compile exit 0, `node --check` the emitted JS, confirm the subscription reads the source + calls hydrate-init.

## OUT OF SCOPE (do NOT build)
- The bare `<engine server>` (auto-self-load) form — RESOLVED as the wrong shape (the engine rides a source, it doesn't self-load).
- The §38 server-push-specific wiring / the MMORPG world engine / G1 (§52 write-back codegen) — the source-subscription handles a §38-updated source for free; the explicit MMORPG path + the persist write-back are separate deferred arcs.
- Auto-persist on client transitions (the dev's `?{}` is the persist, C/WF) — no compiler-generated server-write route.
- The §52-on-engine silent-swallow gap (`g-engine-server-flag-silent-swallow`) — this build SUPERSEDES it for the `server=@source` form; if the bare-flag silent-swallow is trivially adjacent, fire a diagnostic rather than swallow, but don't expand scope.

## STARTUP — BASE IS CURRENT (S199 re-dispatch; F-primitive already present)
Your worktree branches from `13c3c978` (S199 session-start HEAD = origin/main), which ALREADY contains the F-primitive (`7532bd8f`, which built `_scrml_engine_hydrate_init` — the helper you reuse) + 1a/1b/chore/fix + the S198 wrap. **No merge needed — the base is current.** AFTER startup verification + `bun install`, confirm via `git -C "$WORKTREE_ROOT" log --oneline -6` that `7532bd8f` is reachable (the hydrate helper must be present to reuse it). (If for any reason your base is older, `git -C "$WORKTREE_ROOT" fetch origin && git -C "$WORKTREE_ROOT" merge origin/main`.) **AND: this change edits `emit-engine.ts` + likely shifts within-node-corpus engine fixtures — RE-BASELINE the within-node parity allowlist for any over-budget fixture in the SAME landing (the `M6.5.b.0` gate runs in the full suite / pre-push, NOT the pre-commit subset — run `bun run test` for the full baseline before reporting DONE), and run the within-node parity test explicitly.**

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; §"Task-Shape Routing" for a compiler-source codegen/parser task (load-bearing here). Currency: watermark `471cbb34`; HEAD `13c3c978`. The engine-codegen files (`emit-engine.ts`, `symbol-table.ts`, `runtime-template.js`) were touched AFTER the watermark by the F-primitive (`7532bd8f`) + the S198 corpus/wrap — so the map line numbers for those files are STALE; verify every line number against current source via grep/Read before relying on it. Report the maps-consulted line.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Worktree under `.claude/worktrees/agent-<id>/`. BEFORE any other tool call: 1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP — S90). Save WORKTREE_ROOT. 2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. **`git -C "$WORKTREE_ROOT" merge main`** (S112 above). 6. `bun run pretest`.
Path discipline: ALL edits via **Bash** (`perl`/`python3`/heredoc) on worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (S126). Echo path before each write; re-verify with `git diff`/`grep`. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only. SPEC.md is huge — `offset`+`limit` Reads, never full-file.

## COMMIT DISCIPLINE
Commit per phase. First commit message includes verbatim `pwd`. After each edit: `git -C "$WORKTREE_ROOT" diff`; add; commit. Before DONE: `git status` clean. Update `docs/changes/engine-server-source-hydration-eleg-2026-06-16/progress.md` (append-only) per phase.

## VERIFICATION (MANDATORY before DONE)
- **Full** `bun run test` green (NOT just the pre-commit subset — the within-node parity gate + browser/lsp live in the full suite; re-baseline the allowlist for any over-budget engine fixture in this landing).
- R26 dog-food (above) passes.
- The emitted source-subscription calls `_scrml_engine_hydrate_init` (guard-free) + dev writes route through `_scrml_engine_direct_set` (grep the emitted JS).

## FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · merge-main confirmation (F-primitive present) · Phase-0 subscription-separability finding (the load-bearing one) · per-phase results · within-node allowlist re-baseline (which fixtures, the same-landing contract) · full-suite before/after · R26 dog-food result · SPEC §51/§52 amendment summary + §34 rows · maps-consulted line · deferred items. Your final message IS the return value — data, not prose.
