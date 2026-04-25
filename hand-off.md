# scrmlTS — Session 41

**Date opened:** 2026-04-25
**Previous:** `handOffs/hand-off-41.md` (S40 closed)
**Baseline entering S41:** **7,825 pass / 40 skip / 0 fail / 370 files** at `205602d` (S40 close + docs trailer).

---

## 0. Session-start state

- Repo clean at `205602d`. S40 closed with two push waves to origin/main, all green.
- Inbox: 4 messages received since S40 close — surfaced below.
- Untracked in repo: 2 inbox files (Bug L message + sidecar). The other 2 inbox messages (6nz HIJK ack, giti sidecar location reply) are already tracked.
- `dist/` build pollution under `handOffs/incoming/` still pending user disposition (carried from S40).

### Inbox at session start

1. **`2026-04-25-0130-6nz-to-scrmlTS-bugs-h-i-j-k-all-confirmed-fixed.md`** — `needs: fyi`. 6nz retested H/I/J/K against `c51ad15`, all four confirmed fixed. No follow-ups. Apologized for stale-baseline retest. Lists three cosmetic playground-four cleanups they may opportunistically take. Notes L4 acked but no LSP surface yet to exercise (until playground-six).
2. **`2026-04-25-0155-6nz-to-scrmlTS-bug-l-bs-unbalanced-brace-in-string.md`** — `needs: action`. **NEW BUG (Bug L).** BS brace counter is not string-aware: a single string literal containing an unmatched `{` or `}` desyncs `${...}` close detection. Fails as `E-CTX-003 Unclosed 'logic'` / `Unclosed 'program'`. Sibling of the earlier `\n` issue. Sidecar dropped: `2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml`. Tested against `c51ad15`. Workaround: avoid raw braces in string literals or keep brace pairs within one literal. Discovered building playground-five (CM6 sample doc).
3. **`2026-04-25-0732-giti-to-scrmlTS-sidecars-already-landed.md`** — `needs: fyi`. Reply to our 2315 sidecar request: GITI-012/013 sidecars were dropped at `0728` together with the cover message; PA had already moved them into `handOffs/incoming/read/` on the previous turn. The 2315 ask crossed them in flight. Both sidecar files are in `read/`. PA already updated intakes (commit `a71f849`) — both reference the read/ paths.

### Pre-existing intakes (open, not yet worked)

- `fix-acorn-implicit-dep` — `acorn` missing from package.json (clean-clone reproducibility)
- `lsp-cleanup-retired-bpp-import` — drop retired `runBPP` import from `lsp/server.js:26`
- `fix-server-eq-helper-import` (GITI-012) — `==` in server fn references `_scrml_structural_eq` but `.server.js` doesn't import or inline it. Sidecar in read/. **Intake still tagged `#awaiting-sidecar` — needs retag now that sidecar is filed.**
- `fix-arrow-object-literal-paren-loss` (GITI-013) — `f => ({ ... })` emits `(f) => {...}` (parens stripped → block-statement parse). Sidecar in read/. Same stale `#awaiting-sidecar` tag.

---

## 1. Work this session

(empty — session open)

---

## 2. Next priority

1. **Triage Bug L** (BS string-awareness). Decide whether to file as intake + queue, or fold into a broader BS string-handling pass alongside the `\n` sibling. 6nz says no urgency — workaround mechanical. Worth scoping the fix-site before deciding the shape.
2. **Retag GITI-012/013 intakes** — drop `#awaiting-sidecar`, add `#sidecar-in-read`. Tiny doc edit.
3. **fix-server-eq-helper-import** (GITI-012) — runtime crash on every server-fn `==` use. Probably trace `_scrml_structural_eq` emission site; primitive `==` should lower to `===` per SPEC §45.4. Medium priority.
4. **fix-arrow-object-literal-paren-loss** (GITI-013) — arrow returning object literal loses wrapping parens. Common pattern; fails `bun --check`. Medium priority.
5. **fix-acorn-implicit-dep** — small footprint, fresh-clone reproducibility.
6. **lsp-cleanup-retired-bpp-import** — trivial.
7. **Bun.SQL Phase 2.5** — async PA + real `Bun.SQL` Postgres introspection at compile time. Larger scope (touches `api.js` + downstream).
8. **example 05 E-COMPONENT-020** (forward-ref `InfoStep`) — confirmed pre-existing across S39/S40.

### Carried older

- Auth-middleware CSRF mint-on-403 (session-based path, deferred)
- Phase 0 `^{}` audit continuation (4 items)
- `scrml vendor add <url>` CLI (not started)
- `dist/` build pollution under `handOffs/incoming/` — still needs user disposition
- 6nz playground-four cosmetic reverts (their side; flagged for visibility): `cnLines`/`cnLineNum`/`cnColNum` → `lines`/`cursorLine`/`cursorCol`; `kindLabel: fn` → `function`; buffer-pane interpolation back to `curNode().lines`. None are scrmlTS-side work — informational only.

---

## 3. Standing rules in force

(Carried — see `handOffs/hand-off-41.md` and earlier for full list.)

---

## 4. Session log

- 2026-04-25 — S41 opened. Read pa.md + S40 hand-off. Surveyed inbox: 4 messages (6nz HIJK ack, 6nz Bug L + sidecar, giti sidecar-location reply). Verified GITI-012/013 sidecars already in `read/` per giti's reply. Confirmed S40 baseline at `205602d`. Hand-off rotated to `handOffs/hand-off-41.md`.

---

## Tags
#session-41 #active #bug-l-bs-string-aware #giti-012 #giti-013

## Links
- [handOffs/hand-off-41.md](./handOffs/hand-off-41.md) — S40 closed
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [handOffs/incoming/2026-04-25-0155-6nz-to-scrmlTS-bug-l-bs-unbalanced-brace-in-string.md](./handOffs/incoming/2026-04-25-0155-6nz-to-scrmlTS-bug-l-bs-unbalanced-brace-in-string.md)
- [handOffs/incoming/2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml](./handOffs/incoming/2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml)
- [docs/changes/fix-server-eq-helper-import/intake.md](./docs/changes/fix-server-eq-helper-import/intake.md)
- [docs/changes/fix-arrow-object-literal-paren-loss/intake.md](./docs/changes/fix-arrow-object-literal-paren-loss/intake.md)
- [docs/changes/fix-acorn-implicit-dep/intake.md](./docs/changes/fix-acorn-implicit-dep/intake.md)
- [docs/changes/lsp-cleanup-retired-bpp-import/intake.md](./docs/changes/lsp-cleanup-retired-bpp-import/intake.md)
