# FLIP MANIFEST — SPEC.md arm-arrow migration → `:>`

Change-id: `spec-arm-arrow-migration-2026-05-31`

Migrates `match`-arm and `!{}`-handler-arm separators from deprecated `=>`/`->` to canonical `:>`
inside ```` ```scrml ```` fenced blocks in `compiler/SPEC.md` (S145/S147 ratification; §18.2 / §19 / §34 W-MATCH-ARROW-LEGACY).

**Classification method.** Two oracles + structural rules:
- **Lint/migrate oracle (authoritative):** `bun scrml migrate --fix --dry-run` (the AST-driven rewriter named in the W-MATCH-ARROW-LEGACY message). Run per-block on every ```` ```scrml ```` block; it flips ONLY `match-arm-inline` / `match-arm-block` / `guarded-expr` arm nodes. Post-edit verification: ZERO residual flips on all blocks that build an AST.
- **Structural rules:** for fragment blocks that don't build a standalone AST — ARM iff inside a `match {…}` or `!{…}` block with an arm pattern on the left (`.X` / `::X` / `_` / `else` / `not` / `"str"` / digit / `true|false` / `| ::X` / `< State>`), and NOT inside `transitions {}` / `<machine>` / `<engine>` / `derived=match` / a lambda / a fn-return / a lifecycle paren / a `given`-guard.

**Total flips: 121**  (121)

---

## FLIPPED — match-arm + `!{}`-handler-arm separators → `:>`

`SPEC.md:<line> | <section> | before → after | classified-by`

- `SPEC.md:7148` | §13.5.3 Worked Example — Data Fetch on Mount | `.NotAsked => {}` → `.NotAsked :> {}` | structural (in match{})
- `SPEC.md:7149` | §13.5.3 Worked Example — Data Fetch on Mount | `.Loading  => { <div class="spinner">Loading users...</> }` → `.Loading  :> { <div class="spinner">Loading users...</> }` | structural (in match{})
- `SPEC.md:7150` | §13.5.3 Worked Example — Data Fetch on Mount | `.Ready(users) => {` → `.Ready(users) :> {` | structural (in match{})
- `SPEC.md:7157` | §13.5.3 Worked Example — Data Fetch on Mount | `.Failed(msg) => {` → `.Failed(msg) :> {` | structural (in match{})
- `SPEC.md:7433` | §14.3.2 Enum Types as Struct Field Types | `.Pending -> showPending()` → `.Pending :> showPending()` | structural (in match{})
- `SPEC.md:7434` | §14.3.2 Enum Types as Struct Field Types | `.Active  -> showActive()` → `.Active  :> showActive()` | structural (in match{})
- `SPEC.md:7435` | §14.3.2 Enum Types as Struct Field Types | `.Closed  -> showClosed()` → `.Closed  :> showClosed()` | structural (in match{})
- `SPEC.md:7594` | §14.6 Pattern Matching | `::Circle(r) -> ...` → `::Circle(r) :> ...` | structural (in match{})
- `SPEC.md:7595` | §14.6 Pattern Matching | `::Rectangle(w, h) -> ...` → `::Rectangle(w, h) :> ...` | structural (in match{})
- `SPEC.md:7596` | §14.6 Pattern Matching | `::Point -> ...` → `::Point :> ...` | structural (in match{})
- `SPEC.md:8107` | §14.12.6.1 Presence-progression — `(not to T)` — discrimination IS transition | `not => handleAbsence()         // the `not` arm — u is `not`` → `not :> handleAbsence()         // the `not` arm — u is `not`` | structural (in match{})
- `SPEC.md:10992` | §18.2 Syntax | `.North => "up"` → `.North :> "up"` | structural (in match{})
- `SPEC.md:10993` | §18.2 Syntax | `.South => "down"` → `.South :> "down"` | structural (in match{})
- `SPEC.md:10994` | §18.2 Syntax | `.East  => "right"` → `.East  :> "right"` | structural (in match{})
- `SPEC.md:10995` | §18.2 Syntax | `.West  => "left"` → `.West  :> "left"` | structural (in match{})
- `SPEC.md:11002` | §18.2 Syntax | `.Circle(r)       => r * r * 3.14159` → `.Circle(r)       :> r * r * 3.14159` | structural (in match{})
- `SPEC.md:11003` | §18.2 Syntax | `.Rectangle(w, h) => w * h` → `.Rectangle(w, h) :> w * h` | structural (in match{})
- `SPEC.md:11004` | §18.2 Syntax | `.Point           => 0` → `.Point           :> 0` | structural (in match{})
- `SPEC.md:11011` | §18.2 Syntax | `.Circle(r) => {` → `.Circle(r) :> {` | structural (in match{})
- `SPEC.md:11016` | §18.2 Syntax | `.Rectangle(w, h) => w * h` → `.Rectangle(w, h) :> w * h` | structural (in match{})
- `SPEC.md:11017` | §18.2 Syntax | `.Point            => 0` → `.Point            :> 0` | structural (in match{})
- `SPEC.md:11051` | §18.3 Match as Expression and Statement | `.Loading => "Loading..."` → `.Loading :> "Loading..."` | structural (in match{})
- `SPEC.md:11052` | §18.3 Match as Expression and Statement | `.Success => "Done!"` → `.Success :> "Done!"` | structural (in match{})
- `SPEC.md:11053` | §18.3 Match as Expression and Statement | `.Error   => "Failed"` → `.Error   :> "Failed"` | structural (in match{})
- `SPEC.md:11054` | §18.3 Match as Expression and Statement | `else     => "Unknown"` → `else     :> "Unknown"` | structural (in match{})
- `SPEC.md:11068` | §18.3 Match as Expression and Statement | `.Loading => console.log("loading")` → `.Loading :> console.log("loading")` | structural (in match{})
- `SPEC.md:11069` | §18.3 Match as Expression and Statement | `.Success => console.log("done")` → `.Success :> console.log("done")` | structural (in match{})
- `SPEC.md:11070` | §18.3 Match as Expression and Statement | `.Error   => console.log("error")` → `.Error   :> console.log("error")` | structural (in match{})
- `SPEC.md:11071` | §18.3 Match as Expression and Statement | `else     => console.log("unknown")` → `else     :> console.log("unknown")` | structural (in match{})
- `SPEC.md:11108` | §18.4 Result Type Rule | `.Active  => "active"` → `.Active  :> "active"` | structural (in match{})
- `SPEC.md:11109` | §18.4 Result Type Rule | `.Pending => "pending"` → `.Pending :> "pending"` | structural (in match{})
- `SPEC.md:11110` | §18.4 Result Type Rule | `.Closed  => "closed"` → `.Closed  :> "closed"` | structural (in match{})
- `SPEC.md:11118` | §18.4 Result Type Rule | `.On  => "yes"` → `.On  :> "yes"` | structural (in match{})
- `SPEC.md:11119` | §18.4 Result Type Rule | `.Off => 42        // Error: string vs number` → `.Off :> 42        // Error: string vs number` | structural (in match{})
- `SPEC.md:11133` | §18.5 Arm Body Forms | `.Circle(r) => r * r * 3.14159` → `.Circle(r) :> r * r * 3.14159` | structural (§18.5/18.7 arm fragment)
- `SPEC.md:11139` | §18.5 Arm Body Forms | `.Circle(r) => {` → `.Circle(r) :> {` | structural (§18.5/18.7 arm fragment)
- `SPEC.md:11211` | §18.7 Payload Destructuring | `.Rectangle(w, h) => w * h   // w binds width, h binds height` → `.Rectangle(w, h) :> w * h   // w binds width, h binds height` | structural (§18.5/18.7 arm fragment)
- `SPEC.md:11218` | §18.7 Payload Destructuring | `.Rectangle(height: h, width: w) => w * h` → `.Rectangle(height: h, width: w) :> w * h` | structural (§18.5/18.7 arm fragment)
- `SPEC.md:11248` | §18.7 Payload Destructuring | `.Rectangle(w, height: h) => w * h` → `.Rectangle(w, height: h) :> w * h` | structural (§18.5/18.7 arm fragment)
- `SPEC.md:11283` | §18.7 Payload Destructuring | `.Employee(name: n, department: d) => "${n} works in ${d}"` → `.Employee(name: n, department: d) :> "${n} works in ${d}"` | structural (in match{})
- `SPEC.md:11284` | §18.7 Payload Destructuring | `.Contractor(name: n)              => "${n} is a contractor"` → `.Contractor(name: n)              :> "${n} is a contractor"` | structural (in match{})
- `SPEC.md:11296` | §18.7 Payload Destructuring | `.Rectangle(w) => w   // Error E-TYPE-021: arity mismatch, 1 binding for 2 fields` → `.Rectangle(w) :> w   // Error E-TYPE-021: arity mismatch, 1 binding for 2 fields` | structural (in match{})
- `SPEC.md:11297` | §18.7 Payload Destructuring | `else          => 0` → `else          :> 0` | structural (in match{})
- `SPEC.md:11345` | §18.8.2 Match over Union Types (`A | B | not`) | `.Some(s) => "got: ${s}"` → `.Some(s) :> "got: ${s}"` | structural (in match{})
- `SPEC.md:11346` | §18.8.2 Match over Union Types (`A | B | not`) | `.None    => "nothing"` → `.None    :> "nothing"` | structural (in match{})
- `SPEC.md:11456` | §18.11 Nested Patterns — Explicitly Excluded (v1) | `.Add(left, right) => {` → `.Add(left, right) :> {` | structural (in match{})
- `SPEC.md:11458` | §18.11 Nested Patterns — Explicitly Excluded (v1) | `.Lit(v)    => v` → `.Lit(v)    :> v` | structural (in match{})
- `SPEC.md:11459` | §18.11 Nested Patterns — Explicitly Excluded (v1) | `.Add(l, r) => l + r   // recursive; here simplified` → `.Add(l, r) :> l + r   // recursive; here simplified` | structural (in match{})
- `SPEC.md:11463` | §18.11 Nested Patterns — Explicitly Excluded (v1) | `.Lit(v) => v` → `.Lit(v) :> v` | structural (in match{})
- `SPEC.md:11564` | §18.14.2 Duplicate Arms | `::Circle(r) -> r * 2` → `::Circle(r) :> r * 2` | structural (in match{})
- `SPEC.md:11565` | §18.14.2 Duplicate Arms | `::Circle(r) -> r * 3   // Error E-TYPE-023` → `::Circle(r) :> r * 3   // Error E-TYPE-023` | structural (in match{})
- `SPEC.md:11566` | §18.14.2 Duplicate Arms | `::Point -> 0` → `::Point :> 0` | structural (in match{})
- `SPEC.md:11616` | §18.16.1 Syntax | `"active"  => handleActive()` → `"active"  :> handleActive()` | structural (in match{})
- `SPEC.md:11617` | §18.16.1 Syntax | `"banned"  => handleBanned()` → `"banned"  :> handleBanned()` | structural (in match{})
- `SPEC.md:11618` | §18.16.1 Syntax | `else      => handleOther()` → `else      :> handleOther()` | structural (in match{})
- `SPEC.md:11626` | §18.16.1 Syntax | `1    => "high"` → `1    :> "high"` | structural (in match{})
- `SPEC.md:11627` | §18.16.1 Syntax | `2    => "medium"` → `2    :> "medium"` | structural (in match{})
- `SPEC.md:11628` | §18.16.1 Syntax | `3    => "low"` → `3    :> "low"` | structural (in match{})
- `SPEC.md:11629` | §18.16.1 Syntax | `else => "unknown"` → `else :> "unknown"` | structural (in match{})
- `SPEC.md:11637` | §18.16.1 Syntax | `true  => showAdminPanel()` → `true  :> showAdminPanel()` | structural (in match{})
- `SPEC.md:11638` | §18.16.1 Syntax | `false => showUserPanel()` → `false :> showUserPanel()` | structural (in match{})
- `SPEC.md:11775` | §18.16.3 AST Representation | `"admin"  -> showAdmin()` → `"admin"  :> showAdmin()` | structural (in match{})
- `SPEC.md:11776` | §18.16.3 AST Representation | `"editor" -> showEditor()` → `"editor" :> showEditor()` | structural (in match{})
- `SPEC.md:11787` | §18.16.3 AST Representation | `"admin"  -> showAdmin()` → `"admin"  :> showAdmin()` | structural (in match{})
- `SPEC.md:11788` | §18.16.3 AST Representation | `"editor" -> showEditor()` → `"editor" :> showEditor()` | structural (in match{})
- `SPEC.md:11789` | §18.16.3 AST Representation | `_        -> showUser()` → `_        :> showUser()` | structural (in match{})
- `SPEC.md:11801` | §18.16.3 AST Representation | `"active" -> handleActive()   // Error E-TYPE-028` → `"active" :> handleActive()   // Error E-TYPE-028` | structural (in match{})
- `SPEC.md:11802` | §18.16.3 AST Representation | `_        -> handleOther()` → `_        :> handleOther()` | structural (in match{})
- `SPEC.md:11832` | §Motivation | `.Failed(err) => console.log(err.message)` → `.Failed(err) :> console.log(err.message)` | structural (in match{})
- `SPEC.md:11833` | §Motivation | `.Timeout => retryPayment()` → `.Timeout :> retryPayment()` | structural (in match{})
- `SPEC.md:11834` | §Motivation | `else => {}   // deliberately ignoring Active, Pending, Cancelled` → `else :> {}   // deliberately ignoring Active, Pending, Cancelled` | structural (in match{})
- `SPEC.md:11859` | §Syntax | `.Failed(err) => console.log(err.message)` → `.Failed(err) :> console.log(err.message)` | structural (in match{})
- `SPEC.md:11860` | §Syntax | `.Timeout => retryPayment()` → `.Timeout :> retryPayment()` | structural (in match{})
- `SPEC.md:11918` | §Warning: Unnecessary `partial` | `.Active => handleActive()` → `.Active :> handleActive()` | structural (in match{})
- `SPEC.md:11919` | §Warning: Unnecessary `partial` | `.Pending => handlePending()` → `.Pending :> handlePending()` | structural (in match{})
- `SPEC.md:11981` | §Worked Examples | `.Failed(err) => console.log(err.message)` → `.Failed(err) :> console.log(err.message)` | lint(migrate --fix)
- `SPEC.md:11982` | §Worked Examples | `.Timeout => retryPayment()` → `.Timeout :> retryPayment()` | lint(migrate --fix)
- `SPEC.md:12002` | §Worked Examples | `.Active => <p>Active</>` → `.Active :> <p>Active</>` | structural (in match{})
- `SPEC.md:12028` | §Worked Examples | `.Dark => setDarkStyles()` → `.Dark :> setDarkStyles()` | lint(migrate --fix)
- `SPEC.md:12029` | §Worked Examples | `.Light => setLightStyles()` → `.Light :> setLightStyles()` | lint(migrate --fix)
- `SPEC.md:12045` | §Worked Examples | `.UserLogin(userId) => recordLogin(userId)` → `.UserLogin(userId) :> recordLogin(userId)` | structural (in match{})
- `SPEC.md:12046` | §Worked Examples | `.UserLogout(userId) => recordLogout(userId)` → `.UserLogout(userId) :> recordLogout(userId)` | structural (in match{})
- `SPEC.md:12265` | §19.5.2 Semantics | `::Ok(val) -> val` → `::Ok(val) :> val` | structural (in match{})
- `SPEC.md:12266` | §19.5.2 Semantics | `::ErrorVariant(args) -> fail EnclosingErrorType::ErrorVariant(args)` → `::ErrorVariant(args) :> fail EnclosingErrorType::ErrorVariant(args)` | structural (in match{})
- `SPEC.md:12404` | §19.7.1 Logic Context | `::Ok(receipt) -> <div>Success: ${receipt.id}</>` → `::Ok(receipt) :> <div>Success: ${receipt.id}</>` | structural (in match{})
- `SPEC.md:12405` | §19.7.1 Logic Context | `::InvalidAmount(reason) -> <div class="error">${reason}</>` → `::InvalidAmount(reason) :> <div class="error">${reason}</>` | structural (in match{})
- `SPEC.md:12406` | §19.7.1 Logic Context | `::CustomerNotFound(id) -> redirect("/customers")` → `::CustomerNotFound(id) :> redirect("/customers")` | structural (in match{})
- `SPEC.md:12407` | §19.7.1 Logic Context | `::ExpiredCard -> <div>Please update payment method</>` → `::ExpiredCard :> <div>Please update payment method</>` | structural (in match{})
- `SPEC.md:12408` | §19.7.1 Logic Context | `::NetworkError(detail) -> <div>Network issue: ${detail}</>` → `::NetworkError(detail) :> <div>Network issue: ${detail}</>` | structural (in match{})
- `SPEC.md:12633` | §19.9.5 Auto-`!`-Wrap of CPS Server Stubs (Worked Example) | `::Ok(p) -> @profile = p` → `::Ok(p) :> @profile = p` | structural (in match{})
- `SPEC.md:12634` | §19.9.5 Auto-`!`-Wrap of CPS Server Stubs (Worked Example) | `::NetworkError(detail) -> @lastError = detail.message` → `::NetworkError(detail) :> @lastError = detail.message` | structural (in match{})
- `SPEC.md:12635` | §19.9.5 Auto-`!`-Wrap of CPS Server Stubs (Worked Example) | `::ServerError(detail) -> @lastError = detail.message` → `::ServerError(detail) :> @lastError = detail.message` | structural (in match{})
- `SPEC.md:12918` | §19.11.1 Reactive Error State | `::Ok(receipt) -> @receipt = receipt` → `::Ok(receipt) :> @receipt = receipt` | structural (in match{})
- `SPEC.md:12919` | §19.11.1 Reactive Error State | `::InvalidAmount(reason) -> @error = PaymentError::InvalidAmount(reason)` → `::InvalidAmount(reason) :> @error = PaymentError::InvalidAmount(reason)` | structural (in match{})
- `SPEC.md:12920` | §19.11.1 Reactive Error State | `::CustomerNotFound(id) -> @error = PaymentError::CustomerNotFound(id)` → `::CustomerNotFound(id) :> @error = PaymentError::CustomerNotFound(id)` | structural (in match{})
- `SPEC.md:12921` | §19.11.1 Reactive Error State | `::ExpiredCard -> @error = PaymentError::ExpiredCard` → `::ExpiredCard :> @error = PaymentError::ExpiredCard` | structural (in match{})
- `SPEC.md:12922` | §19.11.1 Reactive Error State | `::NetworkError(detail) -> @error = PaymentError::NetworkError(detail)` → `::NetworkError(detail) :> @error = PaymentError::NetworkError(detail)` | structural (in match{})
- `SPEC.md:12929` | §19.11.1 Reactive Error State | `::InvalidAmount(reason) -> lift <div class="validation-error">${reason}</>` → `::InvalidAmount(reason) :> lift <div class="validation-error">${reason}</>` | structural (in match{})
- `SPEC.md:12930` | §19.11.1 Reactive Error State | `::CustomerNotFound(_) -> lift <div class="error">Customer not found</>` → `::CustomerNotFound(_) :> lift <div class="error">Customer not found</>` | structural (in match{})
- `SPEC.md:12931` | §19.11.1 Reactive Error State | `::ExpiredCard -> lift <div class="error">Card expired</>` → `::ExpiredCard :> lift <div class="error">Card expired</>` | structural (in match{})
- `SPEC.md:12932` | §19.11.1 Reactive Error State | `::NetworkError(detail) -> lift <div class="error">${detail}</>` → `::NetworkError(detail) :> lift <div class="error">${detail}</>` | structural (in match{})
- `SPEC.md:12933` | §19.11.1 Reactive Error State | `_ -> lift <div></>` → `_ :> lift <div></>` | structural (in match{})
- `SPEC.md:12955` | §19.11.2 Reactive Propagation Shorthand | `::Ok(receipt) -> lift <div>Paid: ${receipt.id}</>` → `::Ok(receipt) :> lift <div>Paid: ${receipt.id}</>` | structural (in match{})
- `SPEC.md:12956` | §19.11.2 Reactive Propagation Shorthand | `_ -> lift <div></>` → `_ :> lift <div></>` | structural (in match{})
- `SPEC.md:13219` | §19.14.1 Payment Processing Flow | `::Ok(txn) -> <div class="success">Payment ${txn.id} confirmed!</>` → `::Ok(txn) :> <div class="success">Payment ${txn.id} confirmed!</>` | structural (in match{})
- `SPEC.md:16967` | §34.4.3 `match` arms | `.Admin => useAdminToken(token)` → `.Admin :> useAdminToken(token)` | structural (in match{})
- `SPEC.md:16968` | §34.4.3 `match` arms | `.User  => useToken(token)` → `.User  :> useToken(token)` | structural (in match{})
- `SPEC.md:16969` | §34.4.3 `match` arms | `.Guest => discardToken(token)` → `.Guest :> discardToken(token)` | structural (in match{})
- `SPEC.md:16975` | §34.4.3 `match` arms | `.Admin => useAdminToken(token)` → `.Admin :> useAdminToken(token)` | structural (in match{})
- `SPEC.md:16976` | §34.4.3 `match` arms | `.User  => useToken(token)` → `.User  :> useToken(token)` | structural (in match{})
- `SPEC.md:16977` | §34.4.3 `match` arms | `.Guest => doSomethingElse()   // token not consumed — E-LIN-003` → `.Guest :> doSomethingElse()   // token not consumed — E-LIN-003` | structural (in match{})
- `SPEC.md:17196` | §35.9 Worked Examples | `.Admin => adminAuth(token)` → `.Admin :> adminAuth(token)` | structural (in match{})
- `SPEC.md:17197` | §35.9 Worked Examples | `.User  => userAuth(token)` → `.User  :> userAuth(token)` | structural (in match{})
- `SPEC.md:17198` | §35.9 Worked Examples | `.Guest => guestAuth(token)` → `.Guest :> guestAuth(token)` | structural (in match{})
- `SPEC.md:20098` | §41.13 `scrml:data` `parseVariant` — boundary-parsing primitive for tagged-variant JSON | `| ::ParseError msg -> { fail LoadError::Malformed(msg) }` → `| ::ParseError msg :> { fail LoadError::Malformed(msg) }` | lint+structural (handler)
- `SPEC.md:20838` | §42.2.3 Checking for Presence — `given` | `not        => handleAbsence()` → `not        :> handleAbsence()` | structural (in match{})
- `SPEC.md:24727` | §51.0.M `<onTimeout>` element — temporal transitions on `<engine>` (S67, 2026-05-07) | `| ::Network msg -> { @loadPhase = .Error(msg); return }` → `| ::Network msg :> { @loadPhase = .Error(msg); return }` | lint+structural (handler)
- `SPEC.md:24728` | §51.0.M `<onTimeout>` element — temporal transitions on `<engine>` (S67, 2026-05-07) | `| ::Empty       -> { @loadPhase = .Done(0);    return }` → `| ::Empty       :> { @loadPhase = .Done(0);    return }` | lint+structural (handler)
- `SPEC.md:29204` | §54.4 Field Visibility and Narrowing | `< Draft>     => "editing"` → `< Draft>     :> "editing"` | structural (in match{})
- `SPEC.md:29205` | §54.4 Field Visibility and Narrowing | `< Validated> => "ready"` → `< Validated> :> "ready"` | structural (in match{})
- `SPEC.md:29206` | §54.4 Field Visibility and Narrowing | `< Submitted> => "done"` → `< Submitted> :> "done"` | structural (in match{})

---

## SKIPPED / NOT FLIPPED — 233 occurrences (PA spot-check boundary)

Each occurrence below was deliberately NOT flipped. Categories C and D are the load-bearing
boundary cases; A/B/E/F are the bulk DO-NOT-TOUCH classes.

### C. `derived=match` arms — AMBIGUOUS (see note below; NOT flipped)  (3)

- `SPEC.md:24591` | §51.0.J Derived engines — `derived=expr` (Lock L20) | `.Small | .Big => .Healthy`
- `SPEC.md:24592` | §51.0.J Derived engines — `derived=expr` (Lock L20) | `.Fire | .Cape => .AtRisk`
- `SPEC.md:24593` | §51.0.J Derived engines — `derived=expr` (Lock L20) | `_              => .Critical`

### D. `given`-guard arms (standalone + in-match) — SKIPPED (lint excludes; separate :> dispatch — item 6)  (5)

- `SPEC.md:8082` | §14.12.6.1 Presence-progression — `(not to T)` — discrimination IS transition | `given u => {`
- `SPEC.md:8108` | §14.12.6.1 Presence-progression — `(not to T)` — discrimination IS transition | `given u => {`
- `SPEC.md:20809` | §42.2.3 Checking for Presence — `given` | `given x => {`
- `SPEC.md:20820` | §42.2.3 Checking for Presence — `given` | `given x, y => {`
- `SPEC.md:20839` | §42.2.3 Checking for Presence — `given` | `given x    => handlePresence(x)`

### A. `transitions {}` enum state-graph arrows (DO NOT TOUCH — Rule 5; lint does NOT fire)  (33)

- `SPEC.md:7100` | §13.5.2 The Canonical Pattern — RemoteData Enum | `.NotAsked => .Loading`
- `SPEC.md:7101` | §13.5.2 The Canonical Pattern — RemoteData Enum | `.Loading  => .Ready`
- `SPEC.md:7102` | §13.5.2 The Canonical Pattern — RemoteData Enum | `.Loading  => .Failed`
- `SPEC.md:7103` | §13.5.2 The Canonical Pattern — RemoteData Enum | `.Ready    => .Loading     // refetch`
- `SPEC.md:7104` | §13.5.2 The Canonical Pattern — RemoteData Enum | `.Failed   => .Loading     // retry`
- `SPEC.md:7124` | §13.5.3 Worked Example — Data Fetch on Mount | `.NotAsked => .Loading`
- `SPEC.md:7125` | §13.5.3 Worked Example — Data Fetch on Mount | `.Loading  => .Ready`
- `SPEC.md:7126` | §13.5.3 Worked Example — Data Fetch on Mount | `.Loading  => .Failed`
- `SPEC.md:7127` | §13.5.3 Worked Example — Data Fetch on Mount | `.Ready    => .Loading`
- `SPEC.md:7128` | §13.5.3 Worked Example — Data Fetch on Mount | `.Failed   => .Loading`
- `SPEC.md:7183` | §13.5.4 Worked Example — Form Submission with Optimistic Update | `.Idle      => .Saving`
- `SPEC.md:7184` | §13.5.4 Worked Example — Form Submission with Optimistic Update | `.Saving    => .Committed`
- `SPEC.md:7185` | §13.5.4 Worked Example — Form Submission with Optimistic Update | `.Saving    => .Failed`
- `SPEC.md:7186` | §13.5.4 Worked Example — Form Submission with Optimistic Update | `.Committed => .Idle`
- `SPEC.md:7187` | §13.5.4 Worked Example — Form Submission with Optimistic Update | `.Failed    => .Idle`
- `SPEC.md:7188` | §13.5.4 Worked Example — Form Submission with Optimistic Update | `.Failed    => .Saving      // retry`
- `SPEC.md:7222` | §13.5.5 Worked Example — Parallel Data Fetch (Multiple Sources) | `transitions { .Loading => .Ready; .Loading => .Failed; .Ready => .Loading; .Failed => .Loading }`
- `SPEC.md:7227` | §13.5.5 Worked Example — Parallel Data Fetch (Multiple Sources) | `transitions { .Loading => .Ready; .Loading => .Failed; .Ready => .Loading; .Failed => .Loading }`
- `SPEC.md:25490` | §51.2.3 Worked Example — Order Status with Type-Level Transitions | `.Pending    => .Processing`
- `SPEC.md:25491` | §51.2.3 Worked Example — Order Status with Type-Level Transitions | `.Pending    => .Cancelled`
- `SPEC.md:25492` | §51.2.3 Worked Example — Order Status with Type-Level Transitions | `.Processing => .Shipped`
- `SPEC.md:25493` | §51.2.3 Worked Example — Order Status with Type-Level Transitions | `.Processing => .Cancelled`
- `SPEC.md:25494` | §51.2.3 Worked Example — Order Status with Type-Level Transitions | `.Shipped    => .Delivered`
- `SPEC.md:25877` | §51.3.5 Worked Examples | `.Pending    => .Processing`
- `SPEC.md:25878` | §51.3.5 Worked Examples | `.Pending    => .Cancelled`
- `SPEC.md:25879` | §51.3.5 Worked Examples | `.Processing => .Shipped`
- `SPEC.md:25880` | §51.3.5 Worked Examples | `.Processing => .Cancelled`
- `SPEC.md:25881` | §51.3.5 Worked Examples | `.Shipped    => .Delivered {`
- `SPEC.md:25917` | §51.3.5 Worked Examples | `.Anonymous      => .Authenticating`
- `SPEC.md:25918` | §51.3.5 Worked Examples | `.Authenticating => .Authenticated`
- `SPEC.md:25919` | §51.3.5 Worked Examples | `.Authenticating => .Anonymous    // login failed — back to start`
- `SPEC.md:25920` | §51.3.5 Worked Examples | `.Authenticated  => .Anonymous    // logout`
- `SPEC.md:25921` | §51.3.5 Worked Examples | `.Authenticated  => .Locked       // too many suspicious actions`

### B. `<machine>` / `<engine>` state-transition rules + rule-string attrs + bind-arrows (DO NOT TOUCH — Rule 5)  (58)

- `SPEC.md:1004` | §4.14 The `:`-shorthand body form (Stage 0b D4 — M15, L20) | `<Loading rule="onResult.ok(n) -> Success(n)" : <p>Loading...</>>`
- `SPEC.md:14082` | §21.8 Cross-file engine import (Stage 0b D4 — M18) | `<Idle : <button rule="load -> Loading">Load</>>`
- `SPEC.md:25637` | §51.3.2 Syntax | `.Small        => .Big | .Fire | .Cape`
- `SPEC.md:25638` | §51.3.2 Syntax | `.Big          => .Fire | .Cape | .Small`
- `SPEC.md:25639` | §51.3.2 Syntax | `.Fire | .Cape => .Small`
- `SPEC.md:25664` | §51.3.2 Syntax | `.Idle               => .Charging(level: l) given (l >= 0)`
- `SPEC.md:25665` | §51.3.2 Syntax | `.Charging(n)        => .Firing(shot: s)    given (n >= 50)`
- `SPEC.md:25666` | §51.3.2 Syntax | `.Charging(n)        => .Idle               given (n < 10)`
- `SPEC.md:25667` | §51.3.2 Syntax | `.Firing(s)          => .Reloading(reason: r) { log("fired " + s.id + " → reloading: " + r) }`
- `SPEC.md:25668` | §51.3.2 Syntax | `.Reloading          => .Idle`
- `SPEC.md:25713` | §51.3.2 Syntax | `* => * given (self.start < self.end) [valid_date_range]`
- `SPEC.md:25714` | §51.3.2 Syntax | `* => * given (self.nights > 0 && self.nights < 365) [valid_nights]`
- `SPEC.md:25828` | §51.3.5 Worked Examples | `.Todo       => .InProgress`
- `SPEC.md:25829` | §51.3.5 Worked Examples | `.InProgress => .Done`
- `SPEC.md:25835` | §51.3.5 Worked Examples | `.Todo       => .InProgress`
- `SPEC.md:25836` | §51.3.5 Worked Examples | `.InProgress => .Done`
- `SPEC.md:25837` | §51.3.5 Worked Examples | `.InProgress => .Todo`
- `SPEC.md:25838` | §51.3.5 Worked Examples | `.Done       => .Todo   given @currentUser.isAdmin`
- `SPEC.md:25839` | §51.3.5 Worked Examples | `.Done       => .InProgress given @currentUser.isAdmin`
- `SPEC.md:25961` | §51.4 Multiple Machines per Enum | `.Backlog  => .Active`
- `SPEC.md:25962` | §51.4 Multiple Machines per Enum | `.Active   => .InReview`
- `SPEC.md:25963` | §51.4 Multiple Machines per Enum | `.InReview => .Active    // reviewer requests changes`
- `SPEC.md:25964` | §51.4 Multiple Machines per Enum | `.InReview => .Done`
- `SPEC.md:25965` | §51.4 Multiple Machines per Enum | `.InReview => .Rejected`
- `SPEC.md:25970` | §51.4 Multiple Machines per Enum | `.InReview => .Done`
- `SPEC.md:25971` | §51.4 Multiple Machines per Enum | `.InReview => .Rejected`
- `SPEC.md:25972` | §51.4 Multiple Machines per Enum | `.Done     => .InReview  given @currentUser.role === "qa"  // QA can reopen Done`
- `SPEC.md:25977` | §51.4 Multiple Machines per Enum | `.Backlog  => .Active`
- `SPEC.md:25978` | §51.4 Multiple Machines per Enum | `.Active   => .Backlog    // PM deprioritizes`
- `SPEC.md:25979` | §51.4 Multiple Machines per Enum | `.Done     => .Active     // PM reopens`
- `SPEC.md:25980` | §51.4 Multiple Machines per Enum | `.Rejected => .Backlog    // PM reconsiders`
- `SPEC.md:26257` | §51.9.2 Syntax | `.Draft                                  => .Editable`
- `SPEC.md:26258` | §51.9.2 Syntax | `.Submitted | .Paid | .Shipping          => .ReadOnly`
- `SPEC.md:26259` | §51.9.2 Syntax | `.Delivered | .Cancelled | .Refunded     => .Terminal`
- `SPEC.md:26342` | §51.9.5 Worked Example — Shadow Booleans Eliminated | `.Idle    => .Loading`
- `SPEC.md:26343` | §51.9.5 Worked Example — Shadow Booleans Eliminated | `.Loading => .Success | .Error`
- `SPEC.md:26344` | §51.9.5 Worked Example — Shadow Booleans Eliminated | `.Success | .Error => .Idle`
- `SPEC.md:26350` | §51.9.5 Worked Example — Shadow Booleans Eliminated | `.Idle              => .Idle`
- `SPEC.md:26351` | §51.9.5 Worked Example — Shadow Booleans Eliminated | `.Loading           => .Busy`
- `SPEC.md:26352` | §51.9.5 Worked Example — Shadow Booleans Eliminated | `.Success           => .Done`
- `SPEC.md:26353` | §51.9.5 Worked Example — Shadow Booleans Eliminated | `.Error             => .Failed`
- `SPEC.md:26434` | §51.11.2 Syntax | `.Pending    => .Processing`
- `SPEC.md:26435` | §51.11.2 Syntax | `.Processing => .Shipped`
- `SPEC.md:26436` | §51.11.2 Syntax | `.Shipped    => .Delivered`
- `SPEC.md:26635` | §51.12.2 Syntax | `.Idle                => .Loading`
- `SPEC.md:26636` | §51.12.2 Syntax | `.Loading             => .Done`
- `SPEC.md:26637` | §51.12.2 Syntax | `.Loading after 30s   => .TimedOut`
- `SPEC.md:26670` | §51.12.3.1 Computed-delay form (S67 amendment, 2026-05-07) | `.Connecting after ${@backoffDelay}ms => .Open                         <!-- legacy machine form -->`
- `SPEC.md:26961` | §51.14.2 Syntax | `.Pending    => .Processing`
- `SPEC.md:26962` | §51.14.2 Syntax | `.Processing => .Shipped`
- `SPEC.md:26963` | §51.14.2 Syntax | `.Shipped    => .Delivered`
- `SPEC.md:27117` | §51.15.3 Dispatch semantics — three worked cases | `bind @sub -> < engine SubmissionFlow>`
- `SPEC.md:27138` | §51.15.3 Dispatch semantics — three worked cases | `bind @sub -> < engine SubmissionFlow>`
- `SPEC.md:27227` | §51.16.3 Worked Example | `.OffDuty      => .OnDuty | .SleeperBerth`
- `SPEC.md:27228` | §51.16.3 Worked Example | `.OnDuty       => .Driving | .OffDuty`
- `SPEC.md:27229` | §51.16.3 Worked Example | `.Driving      => .OnDuty | .OffDuty`
- `SPEC.md:27230` | §51.16.3 Worked Example | `.SleeperBerth => .OffDuty`
- `SPEC.md:28476` | §§53.8.1 Orthogonality | `* => * given (self.start < self.end)   // machine governing the struct`

### E. `registerMessages({ .Key: (params) => val })` object-literal lambda values (DO NOT TOUCH — lambda)  (7)

- `SPEC.md:20051` | §41.12 `scrml:data` `registerMessages` — project-level error message registration (Stage 0b D4 — L12) | `.Required:        (field) => `${field} is required.`,`
- `SPEC.md:20052` | §41.12 `scrml:data` `registerMessages` — project-level error message registration (Stage 0b D4 — L12) | `.TooShort:        (field, n) => `${field} must be at least ${n} characters.`,`
- `SPEC.md:20053` | §41.12 `scrml:data` `registerMessages` — project-level error message registration (Stage 0b D4 — L12) | `.EmailInvalid:    (field) => `Please enter a valid email for ${field}.`,`
- `SPEC.md:20054` | §41.12 `scrml:data` `registerMessages` — project-level error message registration (Stage 0b D4 — L12) | `.Custom:          (field, tag) => /* fall through to inline / defaults */,`
- `SPEC.md:29663` | §55.10 The 4-level error message resolution chain (L12) | `.Required:        (field) => `Please fill in ${field}.`,`
- `SPEC.md:29664` | §55.10 The 4-level error message resolution chain (L12) | `.LengthFailed:    (field, pred) => `${field} must satisfy ${pred}.`,`
- `SPEC.md:29665` | §55.10 The 4-level error message resolution chain (L12) | `.PatternMismatch: (field, re) => `${field} doesn't match the expected pattern.`,`

### F. NON-ARM: lambdas / fn-returns / lifecycle parens / comment-only arrows (DO NOT TOUCH — items 1,2,3)  (127)

- `SPEC.md:504` | §4.6 Rule: `<` Suppression Inside Brace-Delimited Contexts (PA-001) | `${ users.filter(u => u.age < 18).map(u => { return <span>; }) }`
- `SPEC.md:811` | §4.12.5 Foreign Language Sidecar (Colocation Pattern) | `${ export function predict(req: PredictionRequest) -> PredictionResult }`
- `SPEC.md:950` | §4.13 Rule: `angleDepth` Tracking in Expression Attribute Value Scanning (PA-005) | `tabPanel={ (tab) => <article><h2>${tab.label}/<p>${tab.body}// }`
- `SPEC.md:1349` | §5.2.1 Event Handler Argument Passing | `<button onclick=${() => deleteItem(item.id)}>Delete</>`
- `SPEC.md:2286` | §6.5.1 Mutating Method Syntax | `@arr = @arr.filter(x => x.id !== id)   // canonical removal`
- `SPEC.md:2342` | §6.5.2 Non-Mutating Derived Arrays | `${ let active = @items.filter(i => i.done === false) }`
- `SPEC.md:2349` | §6.5.2 Non-Mutating Derived Arrays | `const <active> = @items.filter(i => i.done === false)`
- `SPEC.md:2421` | §6.5.5 Full Replacement | `@items = fetchedData.map(d => ({ id: d.id, name: d.name }))`
- `SPEC.md:2468` | §6.5.7 Reactive Arrays of State Objects | `@todos = @todos.map(t => t.id === id ? { ...t, done: !t.done } : t)`
- `SPEC.md:2492` | §6.5.8 Worked Examples | `@todos = @todos.filter(t => t.id !== id)`
- `SPEC.md:2518` | §6.5.8 Worked Examples | `const <doneCount> = @items.filter(i => i.done).length`
- `SPEC.md:3350` | §6.6.18 Value-Mutation of a Derived Cell — E-DERIVED-VALUE-MUTATE | `const <filteredItems> = @items.filter(i => i.active)`
- `SPEC.md:3390` | §6.6.18 Value-Mutation of a Derived Cell — E-DERIVED-VALUE-MUTATE | `const <activeItems> = @items.filter(i => i.active)`
- `SPEC.md:3421` | §6.6.18 Value-Mutation of a Derived Cell — E-DERIVED-VALUE-MUTATE | `const <activeItems> = @items.filter(i => i.active)`
- `SPEC.md:3536` | §Syntax | `cleanup(() => { closeConnection() })`
- `SPEC.md:3568` | §Scope Resolution for Imported Functions | `cleanup(() => ws.close())   // registers on CALLER's scope`
- `SPEC.md:4716` | §Example 2 — Valid: Conditional Panel with Lifecycle-Scoped Timer | `cleanup(() => { disconnectFromRoom() })`
- `SPEC.md:4902` | §Example 9 — Valid: `cleanup()` de-escalation via imported function | `cleanup(() => ws.close())   // cleanup() inside this function => RI classifies as client-side`
- `SPEC.md:4924` | §Example 10 — Edge Case EC-2: Conditional cleanup accumulation | `cleanup(() => { console.log("cleanup", @count) })`
- `SPEC.md:5730` | §Semantics | `function add(a: number, b: number) -> number { return a + b }`
- `SPEC.md:5746` | §Worked Examples | `function greet(name: string, formal?: boolean) -> string {`
- `SPEC.md:6101` | §8.4.1 Fragment Reuse via Call-Graph Extraction | `function activeUsers(filter: string)! -> AppError {`
- `SPEC.md:6338` | §8.10.2 Rewrite (Map Lookup) | `let _keys = xs.map(x => x.id)`
- `SPEC.md:6340` | §8.10.2 Rewrite (Map Lookup) | `let _byKey = new Map(_rows.map(r => [r.id, r]))`
- `SPEC.md:7524` | §14.4.3 Enum Coercion from DB Query Results | `${ @tasks = @tasks.map(row => ({`
- `SPEC.md:7539` | §14.4.3 Enum Coercion from DB Query Results | `${ @issues = ?{`SELECT * FROM issues`}.all().map(row => ({`
- `SPEC.md:7878` | §14.10 Bare-variant inference (Stage 0b D4 — M9) | `function applyMushroom(state: MarioState) -> MarioState {`
- `SPEC.md:7976` | §14.12.2 Canonical glyph — `to` (contextual keyword) | `passwordHash: (not -> string)         // legacy — accepted; surfaces W-LIFECYCLE-LEGACY-ARROW`
- `SPEC.md:8071` | §14.12.6.1 Presence-progression — `(not to T)` — discrimination IS transition | `server function loadUser(id: number) -> (not to User) {`
- `SPEC.md:8136` | §14.12.6.2 Variant-progression — `(.VariantA to .VariantB)` — explicit `transition()` | `server function publish(id: number) -> (.Draft to .Published) {`
- `SPEC.md:8531` | §15.10.1 Prop Substitution into Logic-Block Bodies | `const fn = (name) => name + "!"`
- `SPEC.md:8876` | §15.11.4 Escape Hatch: Function-Typed Props | `onDismiss: () => void,`
- `SPEC.md:8877` | §15.11.4 Escape Hatch: Function-Typed Props | `onRead?: () => void`
- `SPEC.md:8920` | §15.11.4 Escape Hatch: Function-Typed Props | `props={ activeTab: string, onTabChange?: (tab: string) => void }`
- `SPEC.md:8938` | §15.11.4 Escape Hatch: Function-Typed Props | `props={ activeTab: string, onTabChange?: (tab: string) => void }`
- `SPEC.md:9043` | §15.13.1 Reactive Closure Model | `<button onclick=${() => @count = @count + 1}>+</>`
- `SPEC.md:9448` | §16.6 Call-Site — Parametric Slots (Slot Scope) | `tabPanel={ (tab) => <article><h2>${tab.label}/<p>${tab.body}// }`
- `SPEC.md:10443` | §17.7.2 The four canonical shapes | `<span : @.name>          <!-- :-shorthand body -->`
- `SPEC.md:10449` | §17.7.2 The four canonical shapes | `<span class="tag">${@.name}</span>   <!-- bare-body -->`
- `SPEC.md:10670` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<li : @.name>            <!-- canonical :-shorthand: `:` inside opener; mandatory space before; no closer -->`
- `SPEC.md:10671` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<li:@.name>              <!-- E-PARSE-001: no whitespace before `:` -->`
- `SPEC.md:10672` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<li : @.name></>         <!-- E-CLOSER-001: closer present on :-shorthand body -->`
- `SPEC.md:10673` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<li : @.name; @.email>   <!-- E-MULTI-STATEMENT-HANDLER: :-shorthand allows ONE expression -->`
- `SPEC.md:10680` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<li : @.name>                                       <!-- valid §4.14 :-shorthand body -->`
- `SPEC.md:10681` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<a href=@.url : @.title>                            <!-- valid; attrs precede the `:` -->`
- `SPEC.md:10682` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<span class="badge" : @.status.toUpperCase()>       <!-- valid; method-call expression -->`
- `SPEC.md:10683` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<empty : "No contacts yet.">                        <!-- valid; <empty> also accepts :-shorthand -->`
- `SPEC.md:10691` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<h2 : record.title>                                 <!-- :-shorthand body -->`
- `SPEC.md:10693` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `${record.author} — ${formatDate(record.date)}   <!-- bare-body with interpolation -->`
- `SPEC.md:10695` | §17.7.6 `:`-shorthand body composition — leverages §4.14, no new mechanism | `<hr/>                                               <!-- self-closing -->`
- `SPEC.md:10851` | §18.0.1 Block-form `<match for=Type [on=expr]>` | `<!-- Later in the same file, in a different markup region: -->`
- `SPEC.md:10852` | §18.0.1 Block-form `<match for=Type [on=expr]>` | `<match for=MarioState>          <!-- on= auto-implied: @marioState (the engine var) -->`
- `SPEC.md:10893` | §18.0.3 Bare-variant inference in arm patterns | `<Small>   : "🧍"             <!-- .Small inferred as MarioState.Small -->`
- `SPEC.md:10914` | §18.0.3 Bare-variant inference in arm patterns | `<Small> : "?"      <!-- E-VARIANT-AMBIGUOUS — could be either -->`
- `SPEC.md:12188` | §19.4.1 Syntax | `function processPayment(amount, customerId)! -> PaymentError {`
- `SPEC.md:12246` | §19.5.1 Syntax | `function processOrder(orderId)! -> OrderError {`
- `SPEC.md:12450` | §19.8.2 `?{}` Inside a `!` Function | `function loadUser(id)! -> UserError {`
- `SPEC.md:12530` | §19.9.3 CPS Preservation | `server function loadUser(id)! -> UserError { ... }`
- `SPEC.md:12533` | §19.9.3 CPS Preservation | `// function loadUser(id)! -> UserError { /* CPS fetch call */ }`
- `SPEC.md:12560` | §19.9.5 Auto-`!`-Wrap of CPS Server Stubs (Worked Example) | `// function loadProfile(id: number)! -> CpsError { ... }`
- `SPEC.md:12626` | §19.9.5 Auto-`!`-Wrap of CPS Server Stubs (Worked Example) | `function reloadProfile(id)! -> CpsError {`
- `SPEC.md:12675` | §19.9.6 Static Monotonicity Classification + Idempotency-Key Replay | `<!-- "auto" resolves to: postgres shadow table _scrml_idempotency_keys -->`
- `SPEC.md:12843` | §19.10.1 Explicit Transactions | `function transferFunds(from, to, amount)! -> TransferError {`
- `SPEC.md:12861` | §19.10.2 The `transaction` Block | `function transferFunds(from, to, amount)! -> TransferError {`
- `SPEC.md:13078` | §19.12.8 `test-bind` Worked Example | `test-bind fetchUser  = (id) => { id, name: "Alice", email: "a@b.com" }`
- `SPEC.md:13177` | §19.14.1 Payment Processing Flow | `server function processPayment(amount, customerId)! -> PaymentError {`
- `SPEC.md:13243` | §19.14.2 Authentication Flow with Validation Errors | `server function register(email, password)! -> AuthError {`
- `SPEC.md:13283` | §19.14.3 CRUD with SQL Transaction Rollback | `server function updateUserProfile(userId, updates)! -> CrudError {`
- `SPEC.md:15124` | §23.3.2 Declaring a Call Char (Extending the Registry) | `${ extern g computeFFT(data: number[]) -> number[] }`
- `SPEC.md:15166` | §23.3.3 The `extern` Declaration | `${ extern r applyFilter(params: FilterParams, imageData: number[]) -> FilterResult }`
- `SPEC.md:15167` | §23.3.3 The `extern` Declaration | `${ extern r grayscale(imageData: number[]) -> number[] }`
- `SPEC.md:15213` | §23.3.6 Worked Example — Valid (Rust image filter) | `${ extern r applyFilter(brightness: number, pixels: number[]) -> number[] }`
- `SPEC.md:15266` | §23.4 Sidecar Process Declarations (`use foreign:`) | `${ export function predict(req: PredRequest) -> PredResult }`
- `SPEC.md:16869` | §35.2.2 Cross-`${}` Block Lin | `<p>Value is ${token}</>   <!-- counts as the consumption -->`
- `SPEC.md:17129` | §35.6 Interaction with Closures | `let process = () => { useToken(token) }   // token consumed here (captured)`
- `SPEC.md:17137` | §35.6 Interaction with Closures | `let a = () => { useToken(token) }   // consumes token`
- `SPEC.md:17138` | §35.6 Interaction with Closures | `let b = () => { useToken(token) }   // Error E-LIN-002: token used again`
- `SPEC.md:17207` | §35.9 Worked Examples | `let handler = () => { authenticate(token) }   // consumed by capture`
- `SPEC.md:17920` | §38.2 Syntax — inside-`<program>` structural form (v0.3) | `<!-- ... uses @count, @messages, postMessage -->`
- `SPEC.md:18179` | §38.6.2 `topic=` Behavior When Value Is `not` | `<!-- ... user picks a room, sets @selectedRoom = "room-42" ... -->`
- `SPEC.md:18356` | §38.11.3 Per-Instance Scoping Pattern | `<!-- Subscriber side (client): -->`
- `SPEC.md:19202` | §39.2.6 `idempotency-store=` | `<!-- "auto" + db=sqlite resolves to: SQLite shadow table. -->`
- `SPEC.md:19437` | §40.8 v0.3 Program Shape — one-program-per-application | `<!-- App-wide channel (inside <program>, not inside <page>) -->`
- `SPEC.md:19442` | §40.8 v0.3 Program Shape — one-program-per-application | `<!-- Per-route attribute containers -->`
- `SPEC.md:19444` | §40.8 v0.3 Program Shape — one-program-per-application | `<!-- Routes living in entry file's <page> body -->`
- `SPEC.md:19456` | §40.8 v0.3 Program Shape — one-program-per-application | `<!-- ... route content ... -->`
- `SPEC.md:19872` | §40.2.1 Syntax | `<Button onclick=${() => @count++}>Increment</>`
- `SPEC.md:20095` | §41.13 `scrml:data` `parseVariant` — boundary-parsing primitive for tagged-variant JSON | `server function loadResult()! -> LoadError {`
- `SPEC.md:20489` | §41.16 `scrml:data` `tableFor` — type-driven `<table>` rendering from a struct definition + rows | `<column field="actions" :let={(row) =>`
- `SPEC.md:20859` | §42.2.4 Compound Expression Operands | `if ((arr.find(x => x.id == id)) is given) { ... }`
- `SPEC.md:21093` | §43.5.1 RPC (Function-Call Syntax) | `${ export function add(a: number, b: number) -> number { return a + b } }`
- `SPEC.md:21323` | §45.9 Word-form boolean operators — `or` / `and` | `const <visible> = @items.filter(t =>`
- `SPEC.md:22161` | §48.4.1 E-FN-007 — Branch Produces Different State Shape | `fn buildEntity(kind) -> User | Admin {`
- `SPEC.md:22225` | §48.5.4 E-FN-009 — Reactive Reference Captured as Live Subscription | `s.value = meta.subscribe("count", () => { ... })   // live subscription capture`
- `SPEC.md:22519` | §48.14.4 Valid — Union Return Type | `fn buildUser(isAdmin, name) -> AdminUser | GuestUser {`
- `SPEC.md:23050` | §E-LOOP-005: `break`/`continue` Crosses Function Boundary | `let process = () => {`
- `SPEC.md:24254` | §51.0.C Auto-declared variable + auto-derived var name | `<!-- Reads use @playerHealth, not @health -->`
- `SPEC.md:24274` | §51.0.D Mount position rules — declaration IS mount; cross-file via `<EngineName/>` | `<engine for=MarioState initial=.Small>     <!-- renders here -->`
- `SPEC.md:24293` | §51.0.D Mount position rules — declaration IS mount; cross-file via `<EngineName/>` | `<MarioMachine/>     <!-- renders the imported engine here -->`
- `SPEC.md:24330` | §51.0.E The `initial=` attribute — required (lint) on non-derived engines | `<engine for=MarioState>     <!-- W-ENGINE-INITIAL-MISSING: defaulting to .Small (first state-child) -->`
- `SPEC.md:24378` | §51.0.F The `rule=` contract — three forms; compile-time + runtime enforcement | `<button onclick=${ @marioState = .Cape }/>     <!-- COMPILE ERROR: .Cape not in .Small.rule -->`
- `SPEC.md:24401` | §51.0.F.1 Idempotent self-write semantics (v0.3 Option-d synthesis, 2026-05-12) | `<button onclick=${ @marioState = .Small }/>    <!-- runtime no-op (NOT an error) -->`
- `SPEC.md:25040` | §51.0.O `internal:rule=` prefix — internal vs external transitions (S67, 2026-05-07) | `internal:rule=.Playing>          <!-- internal self-transition -->`
- `SPEC.md:25065` | §51.0.O `internal:rule=` prefix — internal vs external transitions (S67, 2026-05-07) | `<Playing rule=.Title                   <!-- external; full lifecycle -->`
- `SPEC.md:25066` | §51.0.O `internal:rule=` prefix — internal vs external transitions (S67, 2026-05-07) | `internal:rule=.Playing>       <!-- internal self-loop; preserves inner -->`
- `SPEC.md:25501` | §51.2.3 Worked Example — Order Status with Type-Level Transitions | `@status = OrderStatus.Processing   // legal: .Pending => .Processing`
- `SPEC.md:25522` | §51.2.3 Worked Example — Order Status with Type-Level Transitions | `@status = OrderStatus.Pending   // E-ENGINE-001: illegal transition .Delivered => .Pending;`
- `SPEC.md:25855` | §51.3.5 Worked Examples | `${ @cardColumn = Column.InProgress }  // legal — .Todo => .InProgress in UserFlow`
- `SPEC.md:25856` | §51.3.5 Worked Examples | `${ @cardColumn = Column.Todo }        // E-ENGINE-001: no rule .InProgress => .Todo in UserFlow`
- `SPEC.md:25861` | §51.3.5 Worked Examples | `${ @adminColumn = Column.Done }       // legal — .InProgress => .Done in AdminFlow`
- `SPEC.md:25862` | §51.3.5 Worked Examples | `${ @adminColumn = Column.Todo }       // runtime check: .Done => .Todo given @currentUser.isAdmin`
- `SPEC.md:25882` | §51.3.5 Worked Examples | `// Effect: fires on every .Shipped => .Delivered transition, in any machine`
- `SPEC.md:25895` | §51.3.5 Worked Examples | `@order = OrderStatus.Processing   // .Pending => .Processing — legal`
- `SPEC.md:25896` | §51.3.5 Worked Examples | `@order = OrderStatus.Shipped      // .Processing => .Shipped — legal`
- `SPEC.md:25900` | §51.3.5 Worked Examples | `@order = OrderStatus.Delivered    // .Shipped => .Delivered — legal; effect fires`
- `SPEC.md:26667` | §51.12.3.1 Computed-delay form (S67 amendment, 2026-05-07) | `<onTimeout after=${@backoffDelay}ms to=.Retry/>                       <!-- engine form -->`
- `SPEC.md:27395` | §52.3.5 Worked Example — Valid (Type-Level Authority) | `const <todoCards> = @cards.filter(c => c.column == Column.Todo)`
- `SPEC.md:27552` | §52.4.5 Worked Example — Valid (Instance-Level Authority) | `const <todoCards> = @cards.filter(c => c.column == "Todo")`
- `SPEC.md:28511` | §§53.8.3 Disambiguation Rule — The `@reactive` Reference Rejection | `//       * => * given (value >= 0 && value <= @maxMana)`
- `SPEC.md:29151` | §54.3 State-Local Transition Declarations | `validate(now: Date) => < Validated> {`
- `SPEC.md:29165` | §54.3 State-Local Transition Declarations | `submit(now: Date) => < Submitted> {`
- `SPEC.md:29178` | §54.3 State-Local Transition Declarations | `// zero outgoing transitions -> positively terminal`
- `SPEC.md:29207` | §54.4 Field Visibility and Narrowing | `// missing any arm -> E-TYPE-020`
- `SPEC.md:29568` | §55.8 The `<errors of=expr/>` first-class element (L13) | `<errors of=@signup.name/>      <!-- per-field; renders first error -->`
- `SPEC.md:29577` | §55.8 The `<errors of=expr/>` first-class element (L13) | `<errors of=@signup all/>          <!-- compound rollup, all errors -->`
- `SPEC.md:29600` | §55.8 The `<errors of=expr/>` first-class element (L13) | `${(err) => <span class="my-error">⚠️ ${ messageFor(err) }</span>}`
- `SPEC.md:30613` | §root         = "sha256:9z8y7x6w..." | `${ export function score(features: number[]) -> number {`

---

## NOTE TO PA — `derived=match` arms (Category C): brief-vs-oracle conflict

The brief's SCOPE says: *"Includes match-in-`derived=` (`<engine derived=match @x { .A => .B  _ => .C }>` — those arms flip)."*

**However, both authoritative oracles EXCLUDE these arms:**
1. The AST-driven `bun scrml migrate --fix` (the canonical rewriter named in the W-MATCH-ARROW-LEGACY message itself) leaves `derived=match` arms UNCHANGED — it walks only `match-arm-inline` / `match-arm-block` / `guarded-expr` nodes (`compiler/src/commands/migrate.js:253-271`). The `derived=match` projection holds its arms as a raw `matchBody` string lowered via `rewriteMatchExpr` at codegen — a different AST path.
2. The `W-MATCH-ARROW-LEGACY` lint (`compiler/src/ast-builder.js:10961,11108`) fires only on the match-expression + `!{}`-handler builder paths — NOT on the `derived=match` projection path. Confirmed: a clean `derived=match` block emits no W-MATCH-ARROW-LEGACY.
3. Structurally these arms are `.From => .To` — IDENTICAL shape to a `transitions {}` rule, which IS a DO-NOT-TOUCH class.

Per the brief's own method (*"lint oracle authoritative where usable"*, *"over-migration is the worst outcome"*, *"When unsure, DO NOT FLIP — list it for PA instead"*), I did NOT flip lines 24591-24593. **If PA confirms the brief's intent overrides the oracle**, the three lines to flip are:

- `SPEC.md:24591` | §51.0.J | `.Small | .Big => .Healthy`
- `SPEC.md:24592` | §51.0.J | `.Fire | .Cape => .AtRisk`
- `SPEC.md:24593` | §51.0.J | `_              => .Critical`

Open design question this surfaces: should the `derived=match` arm-separator participate in the `=>`→`:>` deprecation at all? If yes, the COMPILER (lint + migrate) needs to cover that path too — a doc-only flip here would diverge SPEC from what `migrate --fix` produces on adopter code. Recommend PA route to the canonical-`:>` owner before flipping.
