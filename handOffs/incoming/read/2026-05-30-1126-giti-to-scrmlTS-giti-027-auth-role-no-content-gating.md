---
from: giti
to: scrmlTS
date: 2026-05-30
subject: GITI-027 — `<auth role="X">` does not hide content from unauthorized viewers (no-op in default mode; SSR-HTML leak in per-route mode) (§40)
needs: action
status: unread
compiler: scrmlTS@v0.7.0 (4c9079d2)
class: security-relevant — gated content/behavior reaches lower-role viewers
severity: HIGH (security footgun) — please sanity-check my read; auth splitting is subtle
---

# GITI-027 — `<auth role>` withholds JS mount but not CONTENT; and is a full no-op in default compile mode

Dogfooding the §40 auth surface for giti's roadmap need (gate write controls
behind an `Owner` role; master-list §E hosted-forge blocker). The role-enum
resolution and §40.9 per-role chunk classification work — but the gated *content*
still reaches unauthorized viewers, and in the compile mode giti actually serves,
the gate does nothing at all. Flagging as security-relevant; I may be missing a
serve-layer step, so please confirm.

## Repro

```scrml
<program>
type UserRole:enum = { Anonymous, Owner }
<count> = 0
<div class="app">
  <h1>giti</>
  <p>Public status: ${@count}</>
  <auth role="Owner">
    <button onclick=${@count = @count + 1}>OWNER-ONLY: bump</button>
    <p class="secret">owner-only-marker-12345</>
  </auth>
</div>
</program>
```

Sidecar: `...giti-027-auth-role-no-gating-default-mode.scrml`. Compiles clean (no
`E-AUTH-*`, and notably **no `W-AUTH-*`**).

## Facet 1 — DEFAULT compile mode is a NO-OP (this is the giti-relevant one)

giti's compile-on-serve runs `compile <uiDir> -o <dist>` — **no `--emit-per-route`**.
In that mode:

- `repro.html` (served to everyone) contains the gated markup verbatim — the
  `<auth role="Owner">` tag passes through as a literal element, and the
  `owner-only-marker-12345` secret + `OWNER-ONLY` button are in the body.
- `repro.client.js` wires the owner button's click handler **unconditionally**
  (global `_scrml_click` map + a document-level click listener; no role check).
- The emitted `UserRole` enum is never consulted, and the runtime has **no**
  `<auth>`-element role gating (grep of `runtime-template.js`: only `AuthError`
  + the `scrml:auth` stdlib chunk — nothing hides `<auth>` by viewer role).

Measured on the emitted artifacts:
```
secret marker in served HTML:         1
owner-only button in served HTML:     1
owner handler wired in client bundle: 1
role-check guards in client bundle:   0
W-AUTH warning emitted:               0
```

=> An anonymous viewer both SEES and can USE the owner-only content. `<auth role>`
withholds nothing, and nothing warns the author that the gate is inert.

## Facet 2 — `--emit-per-route` gates JS mount, but the SSR HTML still leaks content

With `--emit-per-route` the §40.9 closure analysis works for the JS mount set:
- `min/Anonymous.initial.js` mounts `h1`, `p`, `auth`, `div` — NOT the owner button
  (node 17) or secret-p (node 20).
- `min/Owner.initial.js` additionally mounts button(17) + secret-p(20). ✅

But there is **one shared `min.html` for all roles**, and its body contains the
owner-only markup verbatim (secret text included). The role-bootstrap script picks
a per-role *chunk*, but the initial HTML payload already carries every role's
content. So:
- Anonymous viewer: secret `owner-only-marker-12345` is in view-source / the DOM;
  only the JS *behavior* (mount/wiring) is withheld, not the *content*.

This matches the §40.9.9 prose literally ("excluded from the **chunk**") but not the
security expectation the `<auth role>` element name implies ("excluded from what the
viewer can see"). chunks.json is also per-role but the HTML is not.

## The question

Is SSR-HTML content-stripping intended to happen at a serve layer (per-role HTML, or
a runtime that removes non-admitted `<auth>` subtrees before paint)? I can't find one
in the emitted output or the runtime. If it's a not-yet-built layer, then `<auth role>`
is currently a chunk-splitting optimization, not a content-visibility control — and
the default-mode no-op + absent warning make it an easy security footgun.

## Suggested fixes (either/both)

1. **Default mode**: if `<auth role>` can't gate without per-route emission, emit a
   `W-AUTH-*` ("auth gating requires --emit-per-route; gate is inert in this build")
   — or apply a runtime role check that removes/hides non-admitted `<auth>` subtrees.
2. **Per-route mode**: strip non-admitted `<auth role>` subtrees from each role's
   served HTML (per-role HTML, or a pre-paint runtime prune driven by the role
   bootstrap that already exists in the head), so gated *content* — not just JS — is
   withheld.

## Impact for giti

Blocks giti from using `<auth role>` to gate write controls (save/switch/merge/undo)
in its compile-on-serve setup — the gate would be fully inert. giti keeps its current
`localDev` + 127.0.0.1 write-gate until this is resolved. Happy to re-test on a fix.

## Tags
#giti-027 #auth #§40 #§40.9 #content-visibility #ssr-leak #default-mode-noop #security #v0.7.0
