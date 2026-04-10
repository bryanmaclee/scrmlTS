#!/usr/bin/env python3
"""
apply-r21-feature-patches.py
Applies R21 gauntlet friction feature spec amendments to compiler/SPEC.md.
Generated: 2026-04-06 — R21 gauntlet friction resolution
Run from project root: python3 scripts/apply-r21-feature-patches.py

Source: docs/spec-issues/SPEC-AMENDMENTS-2026-04-06.md

Changes applied:
  R21-AM-001  §6.7.8 (new) — <timeout> single-shot timer state type
  R21-AM-002  §6.7.8-§6.7.13 renumbered to §6.7.9-§6.7.14
  R21-AM-003  §6.7.10 (new numbering) error code table — add TIMEOUT codes
  R21-AM-004  §18.18 (new) — partial match non-exhaustive opt-out
  R21-AM-005  §18.15 error summary — add E-TYPE-081, W-MATCH-003
  R21-AM-006  SPEC.md version header — add amendment reference line
"""

import sys
import os

SPEC_PATH = "compiler/SPEC.md"

if not os.path.exists(SPEC_PATH):
    print(f"Error: {SPEC_PATH} not found. Run from project root.")
    sys.exit(1)

with open(SPEC_PATH, "r", encoding="utf-8") as f:
    content = f.read()

original_content = content
change_count = 0


def apply(label, old, new):
    global content, change_count
    if old not in content:
        print(f"  MISS  {label}: old text not found in SPEC.md")
        print(f"        Expected snippet: {repr(old[:120])}")
        return
    count = content.count(old)
    if count > 1:
        print(f"  WARN  {label}: old text appears {count} times — applying first occurrence only")
    content = content.replace(old, new, 1)
    change_count += 1
    print(f"  OK    {label}")


# ================================================================
# R21-AM-006: SPEC.md header — add amendment reference line
# ================================================================

apply(
    "R21-AM-006 header amendment reference",
    "> **Amendments applied:** 2026-04-05 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-05.md` for full rationale. RH-001 through RH-006 (reflect(variable) hybrid API).",
    "> **Amendments applied:** 2026-04-05 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-05.md` for full rationale. RH-001 through RH-006 (reflect(variable) hybrid API).\n"
    "> **Amendments applied:** 2026-04-06 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-06.md` for full rationale. R21-AM-001 through R21-AM-007 (<timeout> state type, partial match).",
)

# ================================================================
# R21-AM-002: Renumber §6.7.8-§6.7.13 to §6.7.9-§6.7.14
# ================================================================

# Must renumber in REVERSE ORDER to avoid cascading conflicts
# (rename 6.7.13 -> 6.7.14 before 6.7.12 -> 6.7.13, etc.)

apply(
    "R21-AM-002a §6.7.13 -> §6.7.14 (Alternatives Considered)",
    "### 6.7.13 Alternatives Considered",
    "### 6.7.14 Alternatives Considered",
)

apply(
    "R21-AM-002b §6.7.12 -> §6.7.13 (Open Spec Issues)",
    "### 6.7.12 Open Spec Issues",
    "### 6.7.13 Open Spec Issues",
)

apply(
    "R21-AM-002c §6.7.11 -> §6.7.12 (Interaction Notes)",
    "### 6.7.11 Interaction Notes",
    "### 6.7.12 Interaction Notes",
)

apply(
    "R21-AM-002d §6.7.10 -> §6.7.11 (Worked Examples)",
    "### 6.7.10 Worked Examples",
    "### 6.7.11 Worked Examples",
)

apply(
    "R21-AM-002e §6.7.9 -> §6.7.10 (Error and Warning Code Summary)",
    "### 6.7.9 Error and Warning Code Summary",
    "### 6.7.10 Error and Warning Code Summary",
)

apply(
    "R21-AM-002f §6.7.8 -> §6.7.9 (animationFrame)",
    "### 6.7.8 `animationFrame()` — Animation Loop Scheduling",
    "### 6.7.9 `animationFrame()` — Animation Loop Scheduling",
)

# ================================================================
# R21-AM-002: Update cross-references to renumbered sections
# ================================================================

apply(
    "R21-AM-002g cross-ref §6.7.8 animationFrame in §6.7 intro table",
    "Animation frame scheduling is addressed separately in §6.7.8 (`animationFrame()`).",
    "Animation frame scheduling is addressed separately in §6.7.9 (`animationFrame()`).",
)

apply(
    "R21-AM-002h cross-ref §6.7.13 alternatives from poll section",
    "optional properties (see Alternatives, §6.7.13).\n\nIf a future revision determines that `<request>`",
    "optional properties (see Alternatives, §6.7.14).\n\nIf a future revision determines that `<request>`",
)

apply(
    "R21-AM-002i cross-ref §6.7.13 alternatives from request section",
    "add `loading`, `data`, `error`, and `stale` as optional properties of `<poll>` governed by the absence of `interval` (see Alternatives, §6.7.13).",
    "add `loading`, `data`, `error`, and `stale` as optional properties of `<poll>` governed by the absence of `interval` (see Alternatives, §6.7.14).",
)

apply(
    "R21-AM-002j cross-ref §6.7.11 in E-LIN-005 note",
    "defined in §6.7.11 and the §34 lin section.",
    "defined in §6.7.12 and the §34 lin section.",
)

apply(
    "R21-AM-002k cross-ref §6.7.8 in animationFrame worked example",
    "The `draw` function is an `animationFrame` callback; per §6.7.8,",
    "The `draw` function is an `animationFrame` callback; per §6.7.9,",
)

apply(
    "R21-AM-002l cross-ref §6.7.8 normative in §6.7.11",
    "do NOT create reactive subscriptions. This is normative in §6.7.8. No spec issue file",
    "do NOT create reactive subscriptions. This is normative in §6.7.9. No spec issue file",
)

# ================================================================
# R21-AM-001: Insert §6.7.8 <timeout> section
# ================================================================

TIMEOUT_SECTION = '''### 6.7.8 `<timeout>` — Single-Shot Timer State Type

#### Complexity Budget Justification

`<timeout>` is a distinct built-in state type from `<timer>` for the following reasons,
which constitute its earned complexity budget:

1. **One-shot semantics:** `<timer>` fires repeatedly on every interval tick. `<timeout>`
   fires exactly once, then stops. Adding a one-shot mode to `<timer>` via a `once=true`
   attribute would require `<timer>` to carry both perpetual and one-shot execution models,
   making the element\'s default behavior conditional on an attribute — a reader-hostile
   design. `<timeout>` declares its intent unambiguously.
2. **No `interval` — `delay` instead:** `<timer>` requires `interval`. `<timeout>` requires
   `delay`. The distinct attribute name prevents the most common confusion between the two
   (using `<timeout>` where `<timer>` was intended or vice versa).
3. **`.fired` state:** `<timeout>` exposes a `.fired` boolean property that reports whether
   the one-shot has executed. This property has no meaningful parallel for `<timer>` (which
   has `.tickCount` instead). Merging the two would require documenting which properties are
   relevant in which mode.

If a future revision determines that `<timeout>` cannot justify these distinctions, the
alternative is to retire `<timeout>` and add `once=true` to `<timer>`. See §6.7.14
(Alternatives).

#### Syntax

`<timeout>` is a built-in state type. It is declared as a child element of any element
scope.

```
timeout-decl  ::= \'<timeout\' timeout-attrs \'>\' logic-block \'/\'
                | \'<timeout\' timeout-attrs \'/>\'

timeout-attrs ::= (id-attr)? delay-attr

id-attr       ::= \'id=\' string-literal
delay-attr    ::= \'delay=\' integer-literal
```

The `delay` attribute value is in milliseconds and SHALL be a positive integer literal
or a constant expression. It SHALL NOT be a reactive `@variable` reference (the delay
is fixed at compile time for a given `<timeout>` instance). To vary the delay at runtime,
use `if=` to destroy and re-create the timeout with a different `delay` value.

The `id` attribute is required when the timeout instance is referenced by `<#id>` elsewhere
in the same scope. It is optional when the timeout is self-contained.

`<timeout>` has no `running` attribute. A timeout either fires or has been cancelled.
Use `<#id>.cancel()` to prevent firing.

```scrml
// Minimal timeout — fires once after 5000ms
<timeout delay=5000>
    ${ @sessionExpired = true }
/

// Named timeout — supports .cancel() and .fired
<timeout id="paymentGuard" delay=10000>
    ${ @paymentTimedOut = true }
/

// Cancellable on user action
<button onclick=${<#paymentGuard>.cancel()}>Cancel/
<p if=@paymentTimedOut>Payment window expired./
```

#### Semantics

- A `<timeout>` instance is armed when its enclosing scope mounts (or when added to the
  DOM via `if=`).
- After `delay` milliseconds, the timeout fires: its body (the `${}` logic block) executes
  exactly once, and `<#id>.fired` is set to `true`.
- The timeout SHALL NOT fire more than once. After firing, the timeout is permanently
  disarmed. No `running` attribute, no reset mechanism.
- If `<#id>.cancel()` is called before the delay elapses, the timeout is cancelled. Its
  body SHALL NOT execute. `<#id>.fired` remains `false`.
- `cancel()` called after the timeout has already fired has no effect. `<#id>.fired`
  remains `true`.
- When the enclosing scope destroys, any armed timeout in that scope is automatically
  cancelled as part of the canonical teardown sequence (§6.7.2, step 2). No explicit
  `cleanup()` is required.
- A `<timeout>` with no logic body (self-closing form `<timeout delay=5000/>`) is valid
  but produces W-LIFECYCLE-002 (same code reused: state type has no body and no observable
  effect).

#### Async Body Behavior

When a `<timeout>` body calls a server-inferred function, the body executes asynchronously.
The timeout has already fired (it will not re-fire) before the server call returns. If the
enclosing scope is destroyed while the server call is in flight, the result SHALL be
discarded. The compiler SHALL generate a mounted-guard check in the async continuation
of every `<timeout>` body that contains a server call.

#### Referencing a Timeout Instance

A named `<timeout>` may be referenced using the `<#id>` reference syntax. The following
properties and methods are available:

| Property / Method | Type | Description |
|---|---|---|
| `<#id>.fired` | `boolean` | `true` after the body has executed; `false` before firing or after cancel |
| `<#id>.cancel()` | `() -> void` | Prevent the timeout from firing. No-op if already fired. |

```scrml
<timeout id="paymentGuard" delay=10000>
    ${ @paymentTimedOut = true }
/

when <#paymentGuard>.fired changes {
    ${ logPaymentTimeout() }
}

<p>${<#paymentGuard>.fired ? "Expired" : "Active"}/
```

**`.fired` is reactive.** The compiler SHALL emit the assignment to `<#id>.fired` through
the reactive system so that any markup or `when` block that reads `<#id>.fired`
re-evaluates after the timeout fires.

#### `<timeout>` Inside `for` Iteration

If a `<timeout>` is declared inside a `for` iteration body, one timeout instance is created
per iteration. The compiler SHALL emit W-TIMEOUT-001 when a `<timeout>` is detected inside
a `for/lift` loop body, because this pattern typically indicates accidental N-timeout
creation rather than intentional per-item timeouts.

#### Interaction with Scope Destroy (EC-1)

If a `<timeout>` is armed and the enclosing scope is conditionally mounted (via `if=`) and
the `if=` condition becomes `false` before the delay elapses, the timeout is cancelled
during the canonical teardown sequence (§6.7.2, step 2). If the scope re-mounts (`if=`
returns `true`), a NEW timeout instance is armed from the moment of re-mount, not from the
original arm time. The original delay restarts from zero.

#### Interaction with `lin` (EC-2)

A `lin` variable SHALL NOT be referenced inside a `<timeout>` body. The body of a
`<timeout>` is a deferred execution context — it runs after the surrounding code has
completed. A `lin` variable consumed in a `<timeout>` body would be consumed at an
unpredictable future time, violating the straight-line consumption requirement. The
compiler SHALL emit E-LIN-004 if a `lin` variable is referenced inside a `<timeout>` body.

#### Normative Statements

- A `<timeout>` instance SHALL arm automatically when its enclosing scope mounts.
- A `<timeout>` instance SHALL disarm automatically when its enclosing scope destroys
  (§6.7.2, step 2), preventing firing after teardown.
- The `<timeout>` body SHALL execute exactly once, after `delay` milliseconds from arm time.
- After the body executes, `<#id>.fired` SHALL be set to `true` through the reactive system.
- `<#id>.fired` SHALL be `false` at arm time and SHALL remain `false` if `cancel()` is
  called before the delay elapses.
- `<#id>.cancel()` SHALL prevent the body from executing if called before the delay elapses.
  If called after the body has already executed, it SHALL have no effect.
- The compiler SHALL emit E-TIMEOUT-001 if the `delay` attribute is absent.
- The compiler SHALL emit E-TIMEOUT-002 if the `delay` attribute value is zero or negative.
- The compiler SHALL emit E-TIMEOUT-003 if `<timeout>` is used outside any element scope
  (as defined in §6.7.2). `<timeout>` requires an element scope for automatic cancellation.
- The compiler SHALL emit W-TIMEOUT-001 if `<timeout>` is detected inside a `for/lift`
  loop body.
- The `<timeout>` body SHALL execute within the reactive context of its enclosing scope.
  Writes to `@variables` inside the body SHALL trigger reactive updates exactly as if the
  write occurred in a `${}` logic block.
- The compiler SHALL generate a mounted-guard check in the async continuation of any
  `<timeout>` body that contains a server call, discarding results if the scope is
  destroyed before the call returns.
- The compiler SHALL emit E-LIN-004 if a `lin` variable is referenced inside a `<timeout>`
  body.

#### Worked Examples

**Example 1 — Valid: Session expiry guard**

```scrml
<program>
    @sessionExpired = false

    <timeout id="sessionGuard" delay=1800000>
        ${ @sessionExpired = true }
    /

    <div if=@sessionExpired class="expired-banner">
        <p>Your session has expired. /
        <button onclick=${location.reload()}>Refresh/
    /

    // Cancel on any user activity
    <div onclick=${<#sessionGuard>.cancel()}>
        ${/* app content */}
    /
/
```

Expected compiler output: one `setTimeout` call, a `clearTimeout` call in scope teardown,
and a reactive write to `<#sessionGuard>.fired` after the delay elapses. The `@sessionExpired`
write inside the body triggers reactive re-render of the conditional `<div>`.

**Example 2 — Invalid: missing `delay` attribute**

```scrml
<timeout id="guard">
    ${ @timedOut = true }
/
```

```
Error E-TIMEOUT-001 at line 1: `<timeout>` requires a `delay` attribute.
  Add `delay=<milliseconds>` to specify when the timeout fires.
  Example: <timeout id="guard" delay=5000>
```

**Example 3 — Valid: Cancellable payment window**

```scrml
<program>
    @paymentTimedOut = false

    <timeout id="paymentGuard" delay=10000>
        ${ @paymentTimedOut = true }
    /

    <div>
        <p if=@paymentTimedOut>Payment window has closed./
        <p if=${!@paymentTimedOut}>Complete your payment./
        <button onclick=${<#paymentGuard>.cancel()}>Cancel Payment/
    /
/
```

**Example 4 — Invalid: `delay=0`**

```scrml
<timeout delay=0>
    ${ doSomething() }
/
```

```
Error E-TIMEOUT-002 at line 1: `delay` must be a positive integer (milliseconds).
  `delay=0` is not valid. Use `delay=1` or higher.
```

#### Error and Warning Codes

| Code | Trigger | Severity |
|---|---|---|
| E-TIMEOUT-001 | `<timeout>` missing `delay` attribute | Error |
| E-TIMEOUT-002 | `delay` attribute is zero or negative | Error |
| E-TIMEOUT-003 | `<timeout>` used outside any element scope | Error |
| W-TIMEOUT-001 | `<timeout>` declared inside a `for/lift` loop body | Warning |

#### Interaction Notes

- **§6.7.2 (Scope Model):** `<timeout>` participates in the canonical teardown sequence.
  Armed timeouts are disarmed in step 2 (alongside `<timer>` and `<poll>` stops), before
  `cleanup()` callbacks run.
- **§6.7.5 (`<timer>`):** `<timer>` fires repeatedly; `<timeout>` fires once. Use `<timer>`
  for periodic logic and `<timeout>` for deferred one-shot actions.
- **§6.7.9 (`animationFrame`):** `animationFrame` and `<timeout>` both schedule deferred
  execution, but they operate in different scheduling domains. `animationFrame` is
  frame-rate-aligned. `<timeout>` is wall-clock-aligned. They SHALL NOT be used
  interchangeably.
- **§35 (Linear Types — `lin`):** `lin` variables are prohibited inside `<timeout>` bodies.
  E-LIN-004 applies (deferred execution context). See §35 for the full `lin` rule set.
- **§6.3 (Reactive Semantics):** Writes to `@variables` inside a `<timeout>` body trigger
  reactive updates through the standard reactive write path. The `<timeout>` body is a
  deferred reactive write site.

---

'''

# Insert the new §6.7.8 section before the (now-renumbered) §6.7.9 animationFrame section
apply(
    "R21-AM-001 insert §6.7.8 <timeout> section",
    "### 6.7.9 `animationFrame()` — Animation Loop Scheduling",
    TIMEOUT_SECTION + "### 6.7.9 `animationFrame()` — Animation Loop Scheduling",
)

# ================================================================
# R21-AM-003: Add TIMEOUT error codes to §6.7.10 error code table
# ================================================================

apply(
    "R21-AM-003 add TIMEOUT codes to §6.7.10 error table",
    "| W-LIFECYCLE-014 | `<request>` inside `for/lift` loop | Warning |\n\n**Notes on removed/renamed codes",
    "| W-LIFECYCLE-014 | `<request>` inside `for/lift` loop | Warning |\n"
    "| E-TIMEOUT-001 | `<timeout>` missing `delay` attribute | Error |\n"
    "| E-TIMEOUT-002 | `<timeout>` `delay` attribute is zero or negative | Error |\n"
    "| E-TIMEOUT-003 | `<timeout>` used outside any element scope | Error |\n"
    "| W-TIMEOUT-001 | `<timeout>` declared inside a `for/lift` loop body | Warning |\n"
    "\n**Notes on removed/renamed codes",
)

# ================================================================
# R21-AM-004: Insert §18.18 partial match section
# ================================================================

PARTIAL_MATCH_SECTION = '''---

### 18.18 `partial match` — Opt-Out of Exhaustiveness in Logic Context

#### Motivation

`match` is exhaustive by design (§18.8). In rendering contexts, exhaustiveness is
non-negotiable: a missing arm means missing UI, a runtime bug, or a blank screen. The
compiler enforcing exhaustiveness in rendering contexts is a feature, not a limitation.

In logic/expression contexts, exhaustiveness is still the correct default. However, there
are legitimate patterns where a developer intends to act on a subset of variants and
explicitly ignore the rest. The current workaround is an `else =>` arm that does nothing:

```scrml
match @status {
    .Failed(err) => console.log(err.message)
    .Timeout => retryPayment()
    else => {}   // deliberately ignoring Active, Pending, Cancelled
}
```

This satisfies the compiler but obscures intent. The reader cannot distinguish "I handled
everything I care about" from "I forgot the other variants." The `partial` keyword makes
the intent explicit.

#### Syntax

```
partial-match-expr ::= \'partial\' match-expr

match-expr ::= \'match\' expression \'{\' match-arms \'}\'
match-arms ::= match-arm+
match-arm  ::= is-pattern \'=>\' arm-body  // canonical; aliases valid per §18.1
```

`partial` is a modifier keyword placed immediately before `match`. It applies to the
single `match` expression that follows it. It cannot be stored or passed; it is purely
syntactic.

```scrml
// partial match — only handles the variants relevant here; others silently ignored
partial match @status {
    .Failed(err) => console.log(err.message)
    .Timeout => retryPayment()
}
```

#### Semantics

A `partial match` evaluates exactly like a standard `match` expression, except:

1. **No exhaustiveness check.** The compiler SHALL NOT emit E-TYPE-020 for an enum
   `partial match` that does not cover all variants. The compiler SHALL NOT emit E-TYPE-006
   for a union-type `partial match` that does not cover all union members.
2. **Unmatched variants are silently ignored.** At runtime, if the matched value is a
   variant not listed in any arm, execution falls through the `partial match` expression
   with no action taken. The result type of a `partial match` in statement position is
   `void`.
3. **The `else` arm is still valid** inside `partial match`. An `else` arm covers all
   remaining variants. The compiler SHALL emit W-MATCH-001 (unreachable default `else`
   arm) if all variants are already explicitly covered AND `else` is present.

**`partial match` in value position:** A `partial match` in a position where a value is
expected is only valid when the matched type is provably exhaustive given the arms
provided, OR when the `partial match` result is discarded (statement context). If neither
condition is met, the compiler SHALL emit E-TYPE-081.

In practice, `partial match` is intended for statement-context use where the result is
discarded (i.e., the match is for side effects only). For value-producing use, standard
`match` with an `else` arm is the correct form.

#### Restriction: Rendering and Lift Contexts

`partial match` SHALL NOT be used in rendering or `lift` contexts. A `partial match` in
a rendering context is a compile error (E-TYPE-081).

**Why?** In rendering contexts, a `partial match` would silently produce no output for
unmatched variants. This is indistinguishable from a bug (a variant whose rendering was
forgotten) and is exactly the class of error that exhaustive match was designed to prevent.

The compiler detects "rendering context" as any `match` expression that:
- Appears as the direct or indirect value of a `lift` expression, OR
- Appears inside a `${}` block whose parent context is markup, OR
- Appears as the right-hand side of a markup interpolation.

**Normative statement:** If `partial match` appears in any of the three rendering-context
positions above, the compiler SHALL emit E-TYPE-081 with a message explaining that
`partial match` is not valid in rendering/lift context and suggesting standard `match`
with an `else` arm.

#### Warning: Unnecessary `partial`

If `partial match` is used but all variants of the matched type are explicitly covered
by the provided arms, the `partial` modifier has no effect (the match is already
exhaustive). The compiler SHALL emit W-MATCH-003 in this case.

```scrml
type Status:enum = { Active, Pending }

// W-MATCH-003: `partial` is unnecessary — all variants are covered
partial match @status {
    .Active => handleActive()
    .Pending => handlePending()
}
```

```
Warning W-MATCH-003 at line 4: `partial` is unnecessary — all variants of `Status`
are explicitly covered. Remove `partial` to use standard exhaustive match, which will
protect against future variant additions.
```

This warning is intentional. If the enum gains a new variant in the future, a standard
exhaustive match would catch the missing arm at compile time. A `partial match` would
silently ignore it. The warning nudges developers toward exhaustive match when it is
achievable at no additional cost.

#### Valid and Invalid Contexts

| Context | `partial match` valid? | Notes |
|---|---|---|
| Logic context (`${}`) — statement position | YES | Primary intended use |
| Logic context (`${}`) — value position, result discarded | YES | `void` result |
| Logic context (`${}`) — value position, result used | Only if match is provably exhaustive over arms | Otherwise E-TYPE-081 |
| `lift` expression | NO | E-TYPE-081 |
| Markup interpolation (`${}` in markup parent) | NO | E-TYPE-081 |
| Function body — statement position | YES | Same as logic context statement |
| `^{}` meta context | YES | Meta blocks allow `partial match` |

#### Normative Statements

- The `partial` keyword placed immediately before `match` SHALL disable exhaustiveness
  checking for that `match` expression. The compiler SHALL NOT emit E-TYPE-020 or
  E-TYPE-006 for a `partial match` that does not cover all variants.
- `partial match` SHALL be valid only in logic contexts (`${}`) in statement position,
  function bodies in statement position, and `^{}` meta contexts.
- `partial match` in a rendering context (direct or indirect value of `lift`, inside a
  `${}` whose parent is markup, or in a markup interpolation) SHALL be a compile error
  (E-TYPE-081).
- `partial match` used when all variants of the matched enum type are already explicitly
  covered by arms SHALL produce a warning (W-MATCH-003). The `partial` modifier provides
  no protection in this case and removes future-proofing.
- All other `match` rules (§18) SHALL apply unchanged inside `partial match`. Arm syntax,
  payload destructuring, alias forms, and `else` arms are all valid. Only exhaustiveness
  checking is disabled.
- The compiler SHALL NOT allow `partial` to be stored as a value, passed as an argument,
  or used in any position other than immediately before a `match` keyword. `partial` is a
  syntactic modifier, not a first-class value.
- `partial match` SHALL produce `void` as its result type in statement position.

#### Worked Examples

**Example 1 — Valid: Logging subset of payment states**

```scrml
<program>
    type PaymentStatus:enum = {
        Active, Pending, Failed(err: Error), Timeout, Cancelled
    }

    @status:PaymentStatus = .Active

    ${ function handleTerminalStates() {
        partial match @status {
            .Failed(err) => console.log(err.message)
            .Timeout => retryPayment()
            // Active, Pending, Cancelled silently ignored
        }
    } }
/
```

Compiles without error. No E-TYPE-020. The `Active`, `Pending`, and `Cancelled` variants
are intentionally unhandled.

**Example 2 — Invalid: `partial match` in `lift` context**

```scrml
<program>
    type Status:enum = { Active, Inactive }
    @status:Status = .Active

    <div>
        ${
            lift partial match @status {
                .Active => <p>Active/
            }
        }
    /
/
```

```
Error E-TYPE-081 at line 6: `partial match` is not valid in a rendering context.
  `partial match` in a `lift` expression would produce no output for the unhandled
  variant `.Inactive`, making it indistinguishable from a missing-arm bug.
  Use `match` with an `else` arm instead:
    match @status {
        .Active => <p>Active/
        else => {}   // or provide markup for .Inactive
    }
```

**Example 3 — Warning: unnecessary `partial`**

```scrml
type Mode:enum = { Dark, Light }
@mode:Mode = .Light

${ function applyMode() {
    partial match @mode {
        .Dark => setDarkStyles()
        .Light => setLightStyles()
    }
} }
```

```
Warning W-MATCH-003 at line 4: `partial` is unnecessary — all variants of `Mode`
are covered (.Dark, .Light). Remove `partial` to use exhaustive match, which protects
against future variant additions.
```

**Example 4 — Valid: partial match in function body (statement position)**

```scrml
${ server function processEvent(event: AppEvent) {
    partial match event {
        .UserLogin(userId) => recordLogin(userId)
        .UserLogout(userId) => recordLogout(userId)
        // Other AppEvent variants (SystemAlert, ConfigChange, etc.) not handled here
    }
} }
```

Compiles. The function handles only the variants it cares about.

#### Error and Warning Code Summary

| Code | Condition | Severity |
|---|---|---|
| E-TYPE-081 | `partial match` in rendering or lift context | Error |
| W-MATCH-003 | `partial` applied when all variants are already explicitly covered | Warning |

#### Interaction Notes

- **§18.8 (Exhaustiveness):** `partial` is the sole opt-out from §18.8 exhaustiveness
  rules. It is scoped to the single expression it precedes. All other match expressions
  remain fully exhaustive by default.
- **§10 (lift Keyword):** `lift` is the primary rendering emission form. E-TYPE-081 fires
  when `partial match` is the direct or indirect value of a `lift` expression.
- **§18.9 (Valid Contexts):** The valid context table in §18.9 applies to the arms within
  `partial match` unchanged. The `partial` modifier only affects exhaustiveness checking.
- **§18.17 (`is` Operator):** The `is` operator provides a single-variant boolean check
  without any exhaustiveness requirement. For cases where a developer wants to act on
  exactly one variant, `is` in an `if` condition is idiomatic: `if (@status is .Failed)
  { ... }`. `partial match` is appropriate when multiple non-exhaustive cases need
  distinct handling.
- **§34 (Linear Types):** The linear type checker treats `partial match` as having
  zero-statement implicit arms for unhandled variants. A `lin` variable referenced in a
  `partial match` arm is potentially-unconsumed (the unhandled variants do not consume it).
  The compiler SHALL emit E-LIN-003 if a `lin` variable in scope at the `partial match`
  boundary is not provably consumed on all calling paths before the `partial match`.

'''

# Insert §18.18 before ## 19.
apply(
    "R21-AM-004 insert §18.18 partial match section",
    "---\n\n## 19. Error Handling (Revised)",
    PARTIAL_MATCH_SECTION + "## 19. Error Handling (Revised)",
)

# ================================================================
# R21-AM-005: Add E-TYPE-081 and W-MATCH-003 to §18.15 error table
# ================================================================

apply(
    "R21-AM-005 add E-TYPE-081 and W-MATCH-003 to §18.15 error table",
    "| E-TYPE-028 | §18.16 | Literal arm used over an enum type | Error |\n\n",
    "| E-TYPE-028 | §18.16 | Literal arm used over an enum type | Error |\n"
    "| E-TYPE-081 | §18.18 | `partial match` in rendering or lift context | Error |\n"
    "| W-MATCH-003 | §18.18 | `partial` applied when all variants already covered | Warning |\n\n",
)

# ================================================================
# Summary
# ================================================================

print(f"\n{'=' * 60}")
print(f"Applied {change_count} patches to {SPEC_PATH}")

if change_count < 14:
    print(f"WARNING: Expected at least 14 patches; got {change_count}.")
    print("         Some patches may have missed. Review MISS messages above.")
else:
    print("All patches applied successfully.")
    print()
    print("Next steps:")
    print("  1. Review compiler/SPEC.md for correctness")
    print("  2. Run: bash scripts/update-spec-index.sh  (to regenerate line numbers)")
    print("  3. Update compiler/SPEC-INDEX.md manually with new topic entries")
    print("  4. Commit: git add compiler/SPEC.md compiler/SPEC-INDEX.md")
    print("     git commit -m 'spec(§6.7.8,§18.18): add <timeout> and partial match'")

with open(SPEC_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n{SPEC_PATH} written.")
