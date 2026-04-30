# Pre-Snapshot: f-compile-001

**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa02e8b34085db2b4`
**Branch:** `changes/f-compile-001`
**Base commit:** `3dab098 docs(s50): close — fat wrap (4 tracks + 6-milestone dispatch app + 26+ findings)`
**Tier:** T2 (paired Option A + Option B per deep-dive default)
**Authorized scope:** F-COMPILE-001 fix only — Option A (preserve source dir tree) + Option B (basename-collision validation pass)

## Test baseline

```
$ bash scripts/compile-test-samples.sh && bun test
8196 pass
40 skip
0 fail
8236 tests across 385 files
13.0s
```

Identical to main checkout (`/home/bryan-maclee/scrmlMaster/scrmlTS`) — confirms worktree starts clean.

## E2E reproduction — F-COMPILE-001

Source files: 32 `.scrml` across nested subdirs in `examples/23-trucking-dispatch/`

```
$ rm -rf examples/23-trucking-dispatch/dist && \
  bun run compiler/src/cli.js compile examples/23-trucking-dispatch/

Compiled 32 files in 1274.6ms -> examples/23-trucking-dispatch/dist/
  13 warnings
```

Output audit (collisions confirmed):

```
$ find examples/23-trucking-dispatch/dist -type f -name '*.html' | wc -l
17  # expected 32

$ find examples/23-trucking-dispatch/dist -type f -name '*.client.js' | wc -l
28  # expected 32

$ find examples/23-trucking-dispatch/dist -type f -name '*.server.js' | wc -l
17  # expected 32

$ find examples/23-trucking-dispatch/dist -type d
examples/23-trucking-dispatch/dist  # only 1 dir — flat output
```

15 silent overwrites on HTML (and on server.js); 4 on client.js. Driver versions of `home`, `profile`,
and one of the three `load-detail`s win because they are sorted last by basename → directory ordering
in `scanDirectory()`.

Specific collisions audited:

| Basename | Source paths involved | Winner in dist/ |
|---|---|---|
| `home.scrml` | `pages/customer/home.scrml`, `pages/driver/home.scrml` | driver/home |
| `profile.scrml` | `pages/customer/profile.scrml`, `pages/driver/profile.scrml` | driver/profile |
| `load-detail.scrml` | `pages/customer/load-detail.scrml`, `pages/dispatch/load-detail.scrml`, `pages/driver/load-detail.scrml` | driver/load-detail |
| `loads.scrml` | `pages/customer/loads.scrml`, `pages/dispatch/board.scrml` (no, different basename — `board` vs `loads` are distinct) | n/a — `loads.scrml` only used by customer; collision-free |

(Re-audit will be in the post-fix verification.)

## Discovered error code conflict

**The deep-dive proposed `E-CG-002` for the validation pass** because SPEC.md line 12297 reserves it for
"Codegen: conflicting output paths". However:

- `compiler/src/codegen/emit-server.ts:76` already uses `E-CG-002` for "Server-boundary function has no
  generated route name" — a different bug entirely
- This is a pre-existing SPEC/impl drift that long predates this work

**Resolution:** Pick the next-available `E-CG-*` code. Currently used: 001, 002, 003, 006, 010, 011, 012,
013, 014. Next-available: **`E-CG-015`** (avoids the reused 002, leaves 004/005/007/008/009 for any
future codes the team wants to reserve in those gaps for thematic grouping).

**Side-effect SPEC update:** SPEC.md line 12297 currently says E-CG-002 is "conflicting output paths" but
in implementation it's the boundary-function-missing-route-name error. The fix is to update SPEC.md so
that:
- E-CG-002 is described accurately (boundary function missing route name)
- A new entry for E-CG-015 is added with "output basename collision" semantics

This is a **scope adjacency** that surfaces the SPEC/impl drift but doesn't expand the authorized fix —
the new code simply replaces the deep-dive's "use 002" recommendation with "use 015 + correct SPEC".
Surfaced for supervisor visibility; proceeding with E-CG-015.

## Backwards-incompatibility flag

The Option A fix changes the on-disk layout of `dist/` for any project whose source has nested
subdirectories. Adopters of `scrml compile <dir>` who depended on flat output will see their dist/ tree
restructured.

- `examples/23-trucking-dispatch/`: 32 outputs land at `dist/pages/customer/home.html`,
  `dist/pages/driver/home.html`, etc. — the dispatch app's hand-rolled URL routing layer must adapt OR
  the change is a strict win because the previous output was undefined behavior (whichever-overwrote-last).
- `samples/compilation-tests/`: all sources are at the directory root; output remains at `dist/<base>.*`
  unchanged.
- `examples/22-multifile/`: parked Plan B; not in this fix's scope.
- Solo-file compile (`scrml compile foo.scrml`): unchanged — single-file invocation has no nested input.

Post-fix the `samples/compilation-tests/dist/` tree should be unchanged; baseline test suite should
remain at 8196p / 0f.

## Files in scope (per brief)

- `compiler/src/commands/compile.js` — directory-scan resolution
- `compiler/src/commands/build.js` — likely calls into api.js path-construction
- `compiler/src/commands/dev.js` — coordinate with W0b sibling; surface in progress before touching
- `compiler/src/commands/serve.js` — likely depends on dist/ layout for serving
- `compiler/src/api.js` — `compileScrml()` write loop currently at `api.js:509-558`; this is where
  `${base}.html`, `${base}.server.js` etc are written from `basename(filePath, ".scrml")`. This is the
  collision site.
- `compiler/src/codegen/` — `runCG` returns `outputs: Map<sourceFilePath,outputPayload>` already; no
  codegen-internal change needed for path construction. The collision happens in api.js, NOT in codegen.
- `compiler/SPEC.md` — §47.x or §47-adjacent normative subsection on CLI output paths
- `compiler/PIPELINE.md` — §Stage 8 amendment if relevant
- `examples/23-trucking-dispatch/FRICTION.md` — mark RESOLVED
- `examples/23-trucking-dispatch/README.md` — update structure notes
- New tests: `compiler/tests/integration/` — see plan below

## Test plan

### New unit/integration tests (worktree-local)

`compiler/tests/integration/compile-output-tree.test.js`:

1. **Nested-tree fixture (Option A coverage):** 2 files with same basename in different subdirs
   (`pages/a/home.scrml` + `pages/b/home.scrml`); compile via `compileScrml({ inputFiles, outputDir,
   write: true })` from JS API; assert `dist/pages/a/home.html` AND `dist/pages/b/home.html` both exist.
2. **Top-level + nested mix (Option A boundary):** `app.scrml` at root + `pages/foo.scrml`; assert
   `dist/app.html` AND `dist/pages/foo.html` (top-level continues to emit at dist root).
3. **Forced-collision fixture (Option B coverage):** Manufacture a collision that survives Option A —
   the same file reachable via two import paths, OR explicit `inputFiles` array containing two distinct
   paths that resolve to the same dist path (after Option A this is hard to manufacture organically;
   easiest is two source files at non-canonical paths that compute to the same output via custom
   outputDir). Assert `errors[]` contains an `E-CG-015` with `code` and a clear message.
4. **Single-file invocation:** `scrml compile pages/customer/home.scrml -o dist/` — output goes to
   `dist/home.html` (NOT `dist/pages/customer/home.html`); single-file invocation has no input root.

### E2E verification post-fix

```
rm -rf examples/23-trucking-dispatch/dist
bun run compiler/src/cli.js compile examples/23-trucking-dispatch/
find examples/23-trucking-dispatch/dist -type f -name '*.html' | wc -l   # expect 32
find examples/23-trucking-dispatch/dist -type f -name '*.client.js' | wc -l  # expect 32
find examples/23-trucking-dispatch/dist -type f -name '*.server.js' | wc -l  # expect 32
find examples/23-trucking-dispatch/dist -type d                          # expect ~7 (root + pages/* + components/ + models/)
```

### Test-suite delta WHY explanation

Pre-fix: 8196 pass / 40 skip / 0 fail.

Post-fix expected: 8196 + N pass / 40 skip / 0 fail (where N ≥ 4 = new integration test count).

Any change in pass/fail/skip OTHER than +N from new tests must be explained in progress.md. The only
plausible behavioral break would be:
- A test that depended on the flat-dist layout for a multi-file fixture. Most existing tests use
  `samples/compilation-tests/` which is a flat tree (no subdirs), so no change is expected. Will sweep
  for any test that uses `examples/22-multifile/` or `examples/23-trucking-dispatch/` outputs and report.

## Tags

#change-id-f-compile-001 #M6 #pre-snapshot #T2-medium #worktree-isolated #scrmlTS #s51

## Links

- Deep-dive: `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/systemic-silent-failure-sweep-2026-04-30.md` §2.1, §4.6, §5.1, §10.10, §12.3
- FRICTION: `examples/23-trucking-dispatch/FRICTION.md` §F-COMPILE-001 (line 1576)
- Implementation surface: `compiler/src/api.js` lines 499-568 (output write loop)
- E-CG codes audit: `compiler/SPEC.md` lines 12296-12298 (existing) + 15155-15161 (new tier)
