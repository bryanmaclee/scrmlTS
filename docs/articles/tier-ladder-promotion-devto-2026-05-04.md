---
title: The compiler that grows up with your app
published: false
description: scrml has three tiers of case analysis — if= chains, <match> blocks, and <engine>. Same state-children at every tier. The compiler tells you when to promote. You ship a prototype that becomes provable as it matures, without rewriting any of it.
tags: webdev, javascript, programming, compiler
cover_image:
canonical_url:
---

*authored by claude, rubber stamped by Bryan MacLee*

**TL;DR: The goal is a shipped app that is essentially bullet-proof — every reachable state has UI, every transition is intentional, every effect runs at the right moment. Getting there should not require rewriting the prototype. scrml has a three-tier ladder — `if=` → `<match>` → `<engine>` — where the state-children migrate verbatim. The compiler tells you when to promote. The wrapper swap is the commitment moment.**

Every framework I have looked at picks a side in the same fight. The state-machine evangelists insist you specify your machine before you write a feature. The rapid-prototyping evangelists hand you `useState` and let you stack booleans until you have a runtime invariant problem you cannot debug. Both camps are right about something and wrong about something else.

I have hobbled through React when I had to. I have shipped enough boolean-lifecycle code to know exactly the bug class state machines are supposed to prevent. I have also tried to write XState early in a project and bounced off because I did not know the states yet. The point of the prototype is to find out.

scrml takes the position that this is a tooling failure, not a developer failure. If a language wants you to ship a state machine, it should let you start with booleans and a few `if`s, then make promotion mechanical when the boolean count earns it.

This is the fourth of six features the browser-language overview promised to unpack. State machines, but the gentle kind.

## Tier 0 — the boolean lifecycle

Here is a screen anyone has written. A button that loads data, a spinner while it loads, an error message if it fails, a result when it succeeds.

```scrml
<program>

<isLoading> = false
<isError>   = false
<errorMsg>  = ""
<data>      = null

server function load() {
    @isLoading = true
    @isError = false
    try {
        const result = ?{ select * from items }
        @data = result
        @isLoading = false
    } catch (e) {
        @isError = true
        @errorMsg = e.message
        @isLoading = false
    }
}

<button if=(@isLoading == false && @isError == false) onclick=load()>Load</button>

<div if=@isLoading>Loading...</div>
<div if=@isError>${@errorMsg}</div>
<div if=(@data != null)>Got it: ${@data.length} rows</div>

</program>
```

This compiles. This runs. This is also where most apps stop.

Now a feature lands. The button should be disabled while loading instead of disappearing. Then a third path: an empty-result message when the load returns zero rows. Then somebody decides the error should auto-retry once. Each addition is a one-line change to a different boolean. Every change to the rules is a re-audit of every `if=` on the page.

Eventually you have four reactive booleans gating the same UI region. Nothing is provably wrong yet. But you cannot answer "is there a state where the spinner shows AND the result shows?" without re-reading the whole file. The provability has been ground out by addition.

## The first nudge

The scrml compiler watches for this and emits a lint:

```
W-LIFECYCLE-CANDIDATE: 4 reactive booleans gating the same UI tree.
Consider promoting to <match for=Type> for structural exhaustiveness.
  See SPEC §17 (Tier 0/1/2 ladder).
```

This is a warning, not an error. The compiler does not refuse to build your prototype. It tells you the shape of the smell and points at the next tier of the ladder. You can ignore it. You can also `pinned` the offending decls to silence the lint if you have a real reason. But once it fires, you know what the language thinks.

## Tier 1 — `<match>` block

The promotion looks like this. You name the type, write each variant once, give each variant the markup it owns.

```scrml
<program>

type Phase = .Idle | .Loading | .Error(string) | .Success(int)
<phase>: Phase = .Idle

server function load() {
    @phase = .Loading
    try {
        const result = ?{ select * from items }
        @phase = .Success(result.length)
    } catch (e) {
        @phase = .Error(e.message)
    }
}

<match for=Phase>
    <Idle>
        <button onclick=load()>Load</button>
    </>
    <Loading>
        Loading...
    </>
    <Error msg>
        <div>${msg}</div>
    </>
    <Success count>
        <div>Got it: ${count} rows</div>
    </>
</>

</program>
```

What you got from the wrapper:

- **Structural exhaustiveness.** If you forget to handle `.Success`, the compiler errors. If a future version of `Phase` adds `.Empty`, every `<match for=Phase>` site fails compilation until you handle it.
- **No more boolean math.** "Is the spinner showing AND the result showing?" is now a question the type system answers. You are in exactly one variant at a time.
- **Variant data is local.** `<Error msg>` binds the string payload to `msg` inside the variant body. No more `@errorMsg` scoped to the whole file.

The state-children are the same blocks of markup you would have written in Tier 0, just gathered under their variant. Promotion is mostly cut-and-paste, plus the `type` decl.

This is enough for many apps. Ship it.

## The second nudge

Time passes. Features land. Now the screen needs:

- Loading can only start from Idle (not from Error — there is a separate Retry path)
- A successful load should fire an analytics event
- The Error variant gets a Retry button that goes back to Loading

You wire each of these into your event handlers. The wiring works. But the rules — "Loading is reachable from Idle and from Error/Retry" — live distributed across handler bodies. There is no single place to read the transition graph. The compiler emits:

```
W-MATCH-TRANSITIONS-ACCRUING: This <match for=Phase> has 3 transition
points across event handlers (.Idle → .Loading, .Error → .Loading,
.Loading → .Success). Consider promoting to <engine for=Phase> for
transition validation.
  See SPEC §51 (Tier 2 — engines).
```

Same shape. A lint, not an error. You ignore it or you act on it.

## Tier 2 — `<engine>`

Here is where most languages would ask you to rewrite. scrml does not. The state-children migrate verbatim. Only the wrapper changes.

```scrml
<program>

type Phase = .Idle | .Loading | .Error(string) | .Success(int)

<engine for=Phase initial=.Idle>

    <Idle>
        <button rule="load -> Loading">Load</button>
    </>

    <Loading rule="onResult.ok(n) -> Success(n)"
             rule="onResult.err(m) -> Error(m)">
        Loading...
    </>

    <Error msg>
        <div>${msg}</div>
        <button rule="retry -> Loading">Retry</button>
    </>

    <Success count>
        <div>Got it: ${count} rows</div>
    </>

    <onTransition from=Loading to=Success>
        ${ analytics.track("load.success") }
    </>

</>

server function load() {
    @phase.advance(.load)
    try {
        const result = ?{ select * from items }
        @phase.advance(.onResult.ok(result.length))
    } catch (e) {
        @phase.advance(.onResult.err(e.message))
    }
}

</program>
```

Compare against the Tier 1 version. The four state-child blocks are byte-for-byte the same markup. The diff is:

- `<match for=Phase>` → `<engine for=Phase initial=.Idle>`
- `rule="..."` attributes inside the variants
- A new `<onTransition>` element

Everything you got at Tier 1 you keep. What you gained at Tier 2:

- **Active transition rules.** The `rule="load -> Loading"` declaration is the spec for what happens when the `load` event fires from `.Idle`. The compiler now knows the transition graph.
- **Exhaustive transition validation.** If you wrote `rule="onResult.ok -> Sucess(n)"` (typo on `Success`), the compiler errors. If `Phase` gains a `.Cancelled` variant and your engine has no rule that produces it, the compiler tells you the variant is unreachable.
- **`<onTransition>` blocks.** The analytics event lives in one place, declared structurally, attached to a specific edge in the graph. It cannot accidentally fire on the wrong path.
- **No more direct mutation.** `@phase = .Loading` bypasses the rules. The engine variable exposes `.advance(event)` instead, and the rules pick the next variant. The compiler stops you if your `.advance` call doesn't match any rule from the current variant.

The app is now what we wanted from the start. Every reachable state has UI. Every transition is intentional. Every effect is wired to a specific edge in the graph. The whole thing is structurally checkable at compile time.

## Why the migration is mechanical

This is the load-bearing design claim, and it is worth being precise about: **the state-children carry forward verbatim.** The `<Idle>...</>` block in the engine is the same `<Idle>...</>` block from the match. The variant header, the body markup, the bound payload variable — all unchanged.

The only thing that changes between tiers is the wrapper.

```
Tier 0:  if= chains scattered across markup           (no wrapper)
Tier 1:  <match for=Phase> { state-children }         (structural exhaustiveness)
Tier 2:  <engine for=Phase initial=...> {             (transition validation +
            state-children                              transition handlers)
            + rule= attributes
            + <onTransition> blocks
         }
```

You climb the ladder by adding a wrapper, not by rewriting your code. That is the difference between a language that punishes you for prototyping and a language that grows up with your app.

## What this is not

scrml is not Rust, not Elm, not XState, not a state-machine library you import. The tier system is the language's idea of how case analysis on enums should look at three commitment levels. There is no separate runtime to learn, no statechart DSL, no separate file to maintain.

It is also not magic. The compiler cannot infer your intent if you do not name your variants. The lints fire on heuristics — they will sometimes nudge a screen that does not need promotion, and they will sometimes miss a screen that does. They are nudges, not enforcement.

The point is that the compiler has an opinion and tells you about it, and the cost of acting on the opinion is bounded.

## What you do with this

Ship the prototype. When the lint fires, look at it. If it is right — and most of the time it is, by the time you have four booleans gating the same region — promote. The state-children move verbatim. Then ship again.

A scrml app maturing through its tiers is the language working as designed. Booleans-as-lifecycle in early sketch code are not violations; they are in-progress pins. The compiler nudges, the developer responds. The endpoint is an app where every reachable state has UI and every transition is intentional, and you got there without rewriting any of it.

That is the point.

---

*Part of an ongoing series unpacking scrml's design. Earlier pieces: components-are-states, the npm myth, css without a build step. Next: the validator-vocabulary unification.*
