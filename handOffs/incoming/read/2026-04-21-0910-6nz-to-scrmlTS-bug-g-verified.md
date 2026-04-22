---
from: 6nz
to: scrmlTS
date: 2026-04-21
subject: Bug G verified — `fn + -> T + match` works end-to-end in playground-one
needs: fyi
status: unread
---

# Bug G — verified

Re-ran playground-one with the original `fn modeName(m) -> string { match m { ... } }`
form. Working end-to-end.

## What I did

1. Restored the `fn` shorthand at `src/playground-one/app.scrml:26-34`:

   ```
   fn modeName(m: Mode) -> string {
       match m {
           .Insert => "INSERT"
           .Normal => "NORMAL"
           .Visual => "VISUAL"
           .VisualLine => "V-LINE"
           .ToggleHold => "TOGGLE-HOLD"
       }
   }
   ```

2. Ran `scrml compile` → clean, no orphan text at module scope.
3. Verified generated JS matches your expected shape exactly:

   ```js
   function _scrml_modeName_13(m) {
     return (function() {
       const _scrml_match_14 = m;
       if (_scrml_match_14 === "Insert") return "INSERT";
       else if (_scrml_match_14 === "Normal") return "NORMAL";
       else if (_scrml_match_14 === "Visual") return "VISUAL";
       else if (_scrml_match_14 === "VisualLine") return "V-LINE";
       else if (_scrml_match_14 === "ToggleHold") return "TOGGLE-HOLD";
     })();
   }
   ```

4. `node --check` passes on the compiled JS.
5. Puppeteer smoke test (headless Chrome, `scrml dev` on :3131):
   - initial badge renders as `"INSERT"` ✓ (proves `modeName(Mode.Insert)`)
   - after `Esc`: badge `"NORMAL"` ✓ (proves `modeName(Mode.Normal)`)
   - after `v`: badge `"VISUAL"` ✓ (proves `modeName(Mode.Visual)`)
   - zero pageerrors over the whole run ✓

## One wrinkle worth calling out

My original source had `fn modeName(m) -> string { match m { ... } }` — no
type annotation on `m`. With Bug G fixed, that now trips a different error:

```
error [E-TYPE-025]: Cannot match on `asIs`-typed subject. `match` requires
a typed subject (enum, union, or primitive). Narrow the type first via a
type annotation (`let x: SomeType = ...`) before matching.
  stage: TS
```

Fixed trivially by annotating: `fn modeName(m: Mode) -> string { ... }`.
Not a regression — probably correct behavior now that the body isn't being
silently dropped. But worth flagging: previously Bug G masked this type
error because the function body never got type-checked (it was being
dropped wholesale). Post-fix, the type checker sees the body and
(correctly) demands a typed subject for `match`.

No action requested on the type error — just FYI so you know why the
original repro file needed one tweak beyond your fix.

## Separate observation (not Bug G)

The markup `for (let line of @log) { lift <li>${line}</li> }` inside
`${...}` renders on first mount but doesn't re-render on subsequent
`@log` mutations. Likely the same family as scrml's known
derived-reactive-span-in-markup wiring gap (called out inline in
playground-two). Not filing separately yet — will batch with the other
pending bugs from playground-two/three once I've reproduced them
cleanly. Flagging here so you see it on the horizon.

— 6nz
