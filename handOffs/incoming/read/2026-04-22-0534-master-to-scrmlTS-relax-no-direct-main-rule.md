---
from: master
to: scrmlTS
date: 2026-04-22
subject: pa.md updates — (1) relax no-direct-main rule + (2) cross-repo bug reports must carry reproducer source
needs: action
status: unread
---

**Two pa.md edits combined into this message. Both user-authorized 2026-04-22.**

---

# Edit 1 — relax "no direct commits to main" rule

# Rule change — user authorized 2026-04-22

6nz raised that the blanket "do not commit to main directly" rule in every per-repo pa.md hasn't been honored in practice and is producing friction. Recent evidence (across 6nz and others) shows direct-to-main commits have been landing after in-session user approval anyway. The user authorized relaxing the rule across all repos.

## What to change in `scrmlTS/pa.md`

Three occurrences to update for consistency:

1. **Line 71** (under `## Code editing rules`):
   - Old: `Always commit on feature branches, never directly to main`
   - New (suggested): `Commits to main are allowed only after explicit user authorization in the current session. Confirm with the user before the first commit of a session, and before any push. Authorization stands for the scope specified, not beyond.`

2. **Line 82** (under top-level `## What NOT to do`):
   - Old: `Do not commit to main directly`
   - Remove this line (it's now a conditional permission, not a prohibition — covered by the Code editing rules entry above). Alternatively relocate as a positive rule.

3. **Line 154** (under `### What NOT to do` inside `## PER-REPO PA SCOPE`):
   - Old: `Do not commit to main directly`
   - Same treatment as #2 — remove or relocate.

## Scope — what stays unchanged

- **Pushing to origin** — still gated on the master-PA push coordination flow. This change is about *local commits to main*, not pushes.
- **Force-push / destructive ops** — stay explicitly-authorized-only.
- **Hook bypass (`--no-verify`)** — stays explicitly-authorized-only.
- **Feature branches for code work** — still the default; this rule just unblocks direct-to-main when the user has OK'd it in-session (typical case: PA evidence commits, single-commit fixes with user sign-off).

## How to apply in-practice

- Before the *first* commit of a session, ask the user to authorize.
- Before any *push*, reconfirm (this is already how the master-PA push flow works).
- Authorization is scope-bound — "push S35" does not authorize a later surprise commit to main in S36.

---

# Edit 2 — cross-repo bug reports MUST carry reproducer source

User raised this alongside the rule-relaxation ask. The rationale: scrmlTS (as the receiver of most cross-repo bug reports) repeatedly needs to reconstruct reproducers from prose, which wastes cycles and invites mis-reproduction.

## New rule to add in `scrmlTS/pa.md` (suggested location: under `## Cross-repo messaging` or the PA scope section near the bottom)

> ### Cross-repo bug reports — reproducer source required
>
> When this PA files a bug report into another repo's `handOffs/incoming/` — or when this PA receives one — the report MUST include a minimal scrml reproducer:
> - **Inline** as a ` ```scrml ` fenced block in the message body (preferred for ≤ ~200 lines), OR
> - **Sidecar file** dropped next to the message: `YYYY-MM-DD-HHMM-<slug>.scrml` (same stem as the `.md`)
>
> Reproducer must be:
> - **Self-contained** — runnable against the receiving repo's current compiler without external setup
> - **Minimal** — smallest scrml that still exhibits the bug
> - **Version-stamped** — exact command used and compiler SHA (e.g., `scrmltsc repro.scrml` against `scrmlTS@ccae1f6`)
> - **Expected vs actual** — state both in the report body
>
> As the RECEIVER (scrmlTS is the usual target): do not begin diagnosis without the reproducer. If a report arrives without source, drop a reply into the sender's `handOffs/incoming/` requesting it before acting. Verification commits should reference the reproducer file/block so provenance stays traceable.

## Why this matters for scrmlTS specifically

scrmlTS is the primary *receiver* of giti and 6nz bug reports (GITI-001 through GITI-008, Bug A-G, etc.). A reproducer-first policy is higher-leverage here than anywhere else.

---

## After applying both edits

Reply back via `master/handOffs/incoming/` when `pa.md` is updated.

— master PA
