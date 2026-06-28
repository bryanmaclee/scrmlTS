# BRIEF — e-ri-002-server-authoritative-steering-2026-06-28

> Dispatched S228 → scrml-js-codegen-engineer (iso:worktree, opus, bg, agent a1ae40bd). dpa-005 clean residual (ratified S215). Archived per S136.

## Task
Improve the E-RI-002 MESSAGE to STEER to the 2 blessed server-authoritative patterns; do NOT change WHEN it fires (§12.2 RI gate is correct). Message-only.
- (a) `<engine server=@source>` (server-authoritative engine; read-authority codegen landed S196/S216)
- (b) channel-cell + `<match for=Type on=@cell>` (synced-cell view; §38.4 channel-cell = client sync)
Same server-owns-truth/client-derives model at two grains (dpa-005 verdict).

## Authority + reads
dpa-005 verdict `scrml-support/docs/deep-dives/server-authoritative-engine-2026-06-23.md` (ratified S215). SPEC §12.2 (RI) + §52 + §38.4 (Rule 4 — read, don't infer).

## Locate
Verdict cited route-inference.ts:3534-3542 but file advanced + repo renamed — VERIFY. Grep the E-RI-002 message-construction/diagnostic-push (not the comment refs at 37/46). Preserve all fire/skip conditions (channel-scoped skip ~1557, CPS path).

## Verify
R26: synthetic `server function` (SQL-escalated) assigning to a client `<engine>` cell → E-RI-002 fires with NEW message (grep). + verify `<engine server=@source>` compiles (don't steer to a broken form; dpa-005 caveat — read-load landed). Tests assert message contains both recipe names; existing E-RI-002 fire-condition tests stay green. S215 adversarial: non-server fn no-fire · channel-cell write no-fire (§38.4 skip) · recipes are real syntax.

## Discipline
F4 startup + S99/S126 path (Bash-edits, no-cd, first-commit pwd echo); code+test one commit; never --no-verify; PA file-deltas on return.
