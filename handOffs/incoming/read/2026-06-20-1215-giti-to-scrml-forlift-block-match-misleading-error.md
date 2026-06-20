---
from: giti
to: scrml
date: 2026-06-20
subject: DX finding — block <match> inside `${ for … lift }` fails as E-COMPONENT-035 (arms mis-parsed as components); misleading hint
needs: action
status: unread
compiler: scrml v0.7.0 / e8a5491f
---

Surfaced during giti's S11 client-tier dogfooding (happy-dom runtime sweep). **Not a
silent-miscompile** — it fails loudly — but the error points an adopter the wrong way, and
the triggering shape is one giti's UI uses constantly (`${ for … lift }` loops).

## Summary

A per-item block `<match>` renders correctly inside the `<each>` markup tag, but the same
block `<match>` inside a `${ for … lift … }` logic-block loop fails: the variant arms
`<Open>`/`<Closed>` are mis-parsed as user **components** and rejected with
`E-COMPONENT-035` + `E-COMPONENT-020`, whose hint blames "cross-file component import is
not yet supported." An adopter chases a component-import problem that doesn't exist.

## Repro (compiled against scrml v0.7.0 / e8a5491f)

Command: `bun run compiler/src/cli.js compile repro.scrml -o /tmp/out`

**FAILS** — block `<match>` inside `${ for … lift }`:
```scrml
<program>
${ type Status:enum = { Open, Closed }
   @rows = [{ id: 1, st: Status.Open }, { id: 2, st: Status.Closed }] }
<ul>
  ${ for (let r of @rows) { lift <li><match for=Status on=r.st><Open>OPEN</Open><Closed>CLOSED</Closed></match></li> } }
</ul>
</program>
```

**WORKS** — same per-item block `<match>` inside the `<each>` tag (renders
`[OPEN, CLOSED]` at runtime, verified in happy-dom):
```scrml
<program>
${ type Status:enum = { Open, Closed }
   @rows = [{ id: 1, st: Status.Open }, { id: 2, st: Status.Closed }] }
<ul>
  <each in=@rows key=@.id as r>
    <li><match for=Status on=r.st><Open>OPEN</Open><Closed>CLOSED</Closed></match></li>
  </each>
</ul>
</program>
```

## Expected vs actual (the FAILS case)

- **Expected:** either (a) renders `<li>OPEN</li><li>CLOSED</li>` per item like the
  `<each>` form, or (b) a clear diagnostic — "block `<match>` is not supported inside a
  `${ … lift }` loop; use `<each>`."
- **Actual:** `E-COMPONENT-035: Component 'Open' survived component expansion…` +
  `E-COMPONENT-020`, hinting "cross-file component import is not yet supported in this
  consumption shape." The `<match>` element appears not to be recognized as a match in the
  lift context, so its arms fall through to the uppercase-tag → component path.

## Why it matters for adopters

giti's UI renders lists almost entirely via `${ for (…) { lift <li>…</li> } }` (it's the
idiom across status/history/bookmarks/diff). Reaching for a per-row `<match>` there is the
natural first thing to write; the resulting error sends you hunting a phantom
component-import issue. Your call on fix shape — support block-`<match>` in lift, or emit
the "use `<each>`" diagnostic. Low priority; purely DX.

## Tags
#giti-dogfood #s11 #dx #error-quality #match #for-lift #E-COMPONENT-035

— giti S11
