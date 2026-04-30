# Dispatch App — M3 (Driver slice) — Progress

Append-only timestamped log per pa.md crash-recovery rules.

## 2026-04-29 startup

- Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2f723e5636848473`
- Branch: `dispatch-app-m3` (off main `91ecacd`)
- Pre-snapshot `bun run test`: 8,172 / 40 / 0 / 385 — matches expected baseline.
- Required reading complete: kickstarter v1, scoping doc, app.scrml, schema.scrml, models/auth.scrml,
  FRICTION.md, dispatch/board.scrml + dispatch/load-detail.scrml + dispatch/drivers.scrml,
  components (load-card, driver-card, load-status-badge), seeds.scrml, mario state machine.

## Plan

Output: 6 driver pages under `pages/driver/` plus an HOS state machine.

### File shapes (canonical from M2 references)

Each page declares its own `<program db= auth=>` block + inline server fns
(`getCurrentUser`, page-specific `fetch*Server`, page-specific mutators). Pattern carries forward
from M2; F-AUTH-001 + F-AUTH-002 stay open as documented re-confirmations.

Per F-COMPONENT-001: cross-file components are KNOWN-BROKEN. Imports are types + helper functions
ONLY (e.g. `driverStatusClasses`, `formatRate`, `formatPickupAt`); markup is inlined at use sites.

### Driver workflow (carries through every page)

- Driver IDs come from `users.role = 'driver'` rows joined to `drivers.user_id`. Each page resolves
  the current driver row via session token → user_id → drivers row.
- Helper exists in M2 dispatch pages: `getCurrentUser(sessionToken)` returns `{id, email, role}`.
  M3 needs `getCurrentDriver(sessionToken)` that adds the drivers JOIN.
- Status changes (HOS) write log_entries (type='hos_change') AND update `drivers.current_status`.
- Load status changes (driver-driven) write log_entries (type='hos_change' or specific) AND update
  `loads.status` directly (no separate validate-transition layer in M3 — the dispatcher owns the
  full state machine in M2 already; M3 piggybacks on the same `transitionStatusServer` shape).

### Per-page intent

1. **home.scrml** (`/driver` ~250 LOC) — greeting, current_status badge, current_location, current
   load card (if active assignment), HOS quick-actions buttons (4 statuses), recent log entries
   (5 most recent), logout.
2. **load-detail.scrml** (`/driver/loads/:id` ~300 LOC) — load summary, status advance buttons
   (dispatched → loaded → in_transit → delivered), BOL/POD upload (mocked filename via inline
   form), fuel stop form (amount + odometer), breakdown form (description), link to log.
3. **load-log.scrml** (`/driver/loads/:id/log` ~150 LOC) — chronological log_entries list.
4. **hos.scrml** (`/driver/hos` ~250 LOC) — `<machine>` for HOSMachine + DriverStatus, transition
   buttons, hours-driven-today + hours-on-duty-today derived from log_entries, 24h cycle history.
5. **messages.scrml** (`/driver/messages` ~150 LOC) — server-rendered chat with dispatcher;
   form to send + on-submit reload.
6. **profile.scrml** (`/driver/profile` ~100 LOC) — read-only display + edit-name/phone form.

### HOS state machine

`<machine name=HOSMachine for=DriverStatus>` per scoping §7. The DriverStatus enum is already
exported from `schema.scrml`. Transitions per scoping:

- `OffDuty ⇄ OnDuty`
- `OnDuty ⇄ Driving`
- `OffDuty → SleeperBerth`
- `SleeperBerth → OnDuty`
- `OnDuty | Driving → OffDuty`

The actual DB write happens via a server fn (`changeHosServer`) called on transition acceptance
in client-side handlers. The machine evaluates client-side state; server holds canonical record.

### F-RI-001 awareness

Every page has multiple server-call client-functions (refresh + mutators); per F-RI-001-FOLLOW
file-context analysis, expect E-RI-002 to fire and need the M2 workaround pattern:

```
function callServer(...) {
    @errorMessage = ""               // anchor — assigns @var BEFORE server call
    const result = serverFn(...)
    if (result.unauthorized) { window.location.href = "..."; return }
    if (!result.error) { refresh(); return }
    const err = result.error         // local var
    setError(err)                    // helper indirection
}

function setError(msg) {
    @errorMessage = msg
}
```

Use `if (!obj.error)` not `if (obj.error is not)` — F-RI-001-FOLLOW.

### Future-M5 hookpoints

- `/driver/messages` would subscribe to `driver-:id` channel for real-time dispatcher messages.
- `/driver/loads/:id` would subscribe to `load-:id` for status changes pushed by dispatcher.
- `/driver` would subscribe to `driver-:id` for assignment notifications.

### Compile-test cadence

After each file: `bun $WORKTREE_ROOT/compiler/src/cli.js compile $WORKTREE_ROOT/examples/23-trucking-dispatch/`.
After all 6: `bun run test` to confirm 8,172 / 40 / 0 / 385.

## 2026-04-29 close

### Wave 1 — home.scrml

- Hit corpus-invariant idempotency failure on `cur == "off_duty" && (newStatus == "on_duty" || newStatus == "sleeper_berth")` —
  parens stripped on emit, reparse produces a different AST shape. Workaround:
  split conjuncts into separate `if` statements (8 lines instead of 4).
- Logged as F-PAREN-001 (data point, P2).
- Compile clean + tests pass.

### Wave 2 — load-detail.scrml

- Compiled clean first try. Multiple server-call client-fns (transition,
  submitBol, submitPod, submitFuel, submitBreakdown) all use the F-RI-001
  anchor + setError indirection from M2's load-detail. No file-context
  E-RI-002 escalation surfaced.

### Wave 3 — load-log.scrml

- Compiled clean first try. Read-only chronological list. Smallest
  M3 page (~215 LOC).

### Wave 4 — hos.scrml — F-MACHINE-001 + F-NULL-001

- First attempt: `<machine for=DriverStatus>` with `import { DriverStatus }`
  → E-MACHINE-004 ("references unknown type DriverStatus"). Re-declared
  the enum locally → resolved.
- Same compile run also fired 5x E-SYNTAX-042 in GCP3 stage on `== null` /
  `!= null` checks in client-fn bodies. Identical patterns in M2 dispatch
  pages compile clean. The trigger appears to be `<machine>` block presence
  in the same file. Workaround: replace with truthiness checks (`!x`) and
  empty-string sentinels.
- Logged F-MACHINE-001 (P1, machines reject imported types) and
  F-NULL-001 (P1, machine-file null asymmetry).
- Also hit F-PAREN-001 idempotency failures on `ms + (atMs - prevMs)` and
  related arithmetic. Refactored to intermediate `const` bindings.
- After all three: compiled clean, corpus invariant clean.

### Wave 5 — messages.scrml

- Compiled clean first try. Server-rendered chat. M5 hookpoint comment
  documents the `<channel name="driver-${driverId}">` migration.

### Wave 6 — profile.scrml

- Compiled clean first try. Read-only display + edit form. Smallest of
  the form-heavy pages.

### Final state

- 6 driver pages + HOS state machine, all compiling clean.
- 26 files in dist/ (full M3 + M2 + M1 surface).
- `bun run test`: 8,184 / 40 / 0 / 385 (vs. 8,172 baseline — extra 12 are
  corpus-invariant tests counting new files).
- HOS `<machine>` outcome: USED CLEANLY (with F-MACHINE-001 workaround
  for the imported-type rejection).

### New friction findings (M3)

- **F-MACHINE-001 (P1):** `<machine for=Type>` rejects imported types;
  must redeclare locally. Documentation gap + design gap.
- **F-NULL-001 (P1):** `<machine>`-bearing files reject `== null` /
  `!= null` in client-fn bodies (E-SYNTAX-042 in GCP3) even though
  identical patterns work in non-machine files. Asymmetry.
- **F-PAREN-001 (P2):** corpus-invariant idempotency test rejects
  cosmetic parens around sub-expressions (`a + (b - c)` → `a + b - c`
  on emit, AST mismatch). Workaround is intermediate vars; data point
  for future paren-handling work.

### Reconfirmations of existing findings

- F-AUTH-001 (P0): 6 more pages copy the server-side role-gate fallback.
  12 pages total.
- F-AUTH-002 (P0): 6 more pages duplicate `getCurrentUser`. ~84 LOC of
  inline duplication across 12 pages.
- F-COMPONENT-001 (P0, architectural): zero cross-file component
  imports in M3; every page inlines markup. Helper functions
  (`driverStatusClasses`, `formatRate`, etc.) imported and used.

### Future-M5 hookpoints documented

- `/driver` (home.scrml): subscribe to `driver-:id` for assignment
  notifications.
- `/driver/loads/:id` (load-detail.scrml): subscribe to `load-:id` for
  status changes pushed by dispatcher.
- `/driver/loads/:id/log` (load-log.scrml): subscribe to `load-:id` for
  real-time-pushed entries.
- `/driver/hos` (hos.scrml): broadcast HOS events to `dispatch-board` so
  dispatcher sees driver-status changes.
- `/driver/messages` (messages.scrml): subscribe to `driver-:id` for live
  dispatcher pushes; subscribe to `dispatch-board` for broadcasts.

### LOC accounting

```
home.scrml          382 lines
load-detail.scrml   720 lines
load-log.scrml      215 lines
hos.scrml           427 lines
messages.scrml      250 lines
profile.scrml       265 lines
                  -----
                   2259 lines  (vs. ~1,200 budget — over but distributed
                                across 6 pages with detailed comments,
                                inline auth-fns, and HOS derivation logic)
```

The over-budget is principally:
- inline auth fns per F-AUTH-002 (~7 LOC × 6 pages = 42 LOC of duplication);
- HOS hours-derivation logic + payload parsing (~80 LOC client-side);
- inline forms for BOL/POD/fuel/breakdown each take a `<section>` wrapper
  (~40 LOC × 4 = 160 LOC);
- detailed file headers documenting friction context.

### Status: READY FOR MERGE
</content>
</invoke>