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
</content>
</invoke>