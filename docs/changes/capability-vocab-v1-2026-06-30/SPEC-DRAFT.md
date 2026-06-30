# Capability-vocab V1 SPEC landing — STAGING DRAFT

**Change-id:** `capability-vocab-v1-2026-06-30`
**Status:** STAGED (ready to land) — gated on ONE user ratify: the surface spelling (§A below).
**Authority:** RATIFIED S231 — delta-log `[230]` (user "Both: author on program, aggregate to manifest") + deep-dive `scrml-support/docs/deep-dives/foreign-code-capability-gating-design-space-2026-06-27.md` (RATIFIED S231 block) + the V1-reframe `language-compiler-split-2026-06-29.md` §6.

**What's ratified (do NOT re-litigate):**
- **LOCUS** — author the capability set on the `<program>` that governs the `_{}` blocks (the one that carries `lang=`); an inline `_={}` INHERITS its enclosing `<program>`'s set, exactly like it inherits `lang=`. The compiler-AGGREGATED manifest view is the end-state but DEFERRED (rides Pole-D enforcement).
- **VOCAB** (ratified S225, unchanged) — `{ network[], fs-read[], fs-write[], spawn[], env[], db:bool }`, per-cap args (`network("host")`, `fs-read("/path")`).
- **LINT** — advisory `W-FOREIGN-UNDECLARED-CAPABILITY` presence-nudge.
- **DEFAULT** — `[]` (declare-nothing).
- **OPACITY BOUND** (load-bearing, must be SPEC'd) — §23.2.3 says the compiler does NOT parse the `_{}` interior, so the lint nudges declaration-PRESENCE, NOT access-ACCURACY. Accuracy lands at the C4 multi-tenant sandbox flip.
- **POSTURE** — Nominal / discipline-forward, like §14.8.9: V1 ships the AUTHORING habit; enforcement defers; non-breaking-future (declare-now → enforce-later, additively).

---

## §A — THE ONE OPEN RATIFY: surface spelling (falls-under-fingers; your call)

The locus (`<program>`) + vocab + lint + default are ratified. The exact authoring spelling is the
one adopter-facing surface choice left. Two cohesive forms — pick one (or amend); it's a Nominal
section so a later swap is cheap.

**Form A — attribute-list (RECOMMENDED).** A `capabilities=` attribute on `<program>`, sitting in
the existing §4.12.2 attribute table next to `lang=` / `db=` / `protect=` / `build=`. The value is a
bracketed list of capability tokens; arg-bearing caps take parenthesized args; `db` is a bare
presence token.

```scrml
<program lang="go"
         build="go build -o ./bin/svc ./cmd/svc"
         capabilities=[network("api.example.com"), fs-read("/etc/svc/config"), spawn, db]>
    _={
        // Go sidecar code — its declared capability surface is network + fs-read + spawn + db
    }=
</>
```

- Pro: maximally cohesive with the existing `<program>` attribute surface — you're already writing
  `lang=go` on this exact element; `capabilities=[…]` falls under the same fingers. The disposition's
  own words: "alongside `lang=`/`build=`."
- Pro: the deferred manifest-aggregate (`scrml.toml` `[capabilities]`) becomes the COLLECTION of these
  per-`<program>` declarations — author-local, audit-central; the two layers compose like §22.13's
  `[capabilities] host-import` does today.
- Con: a structured bracketed attribute value (`[network("a"), spawn]`) is slightly richer than the
  scalar `lang="go"` / `db="./app.db"` attributes — but `protect=` already takes a field list, so it's
  in-family.

**Form B — TOML-table mirror.** A `[capabilities: …]` sub-block on the program, spelled to mirror the
`scrml.toml` `[capabilities]` manifest table (§22.13) so the per-`<program>` form and the deferred
aggregate look identical.

```scrml
<program lang="go" build="...">
    [capabilities:
        network = ["api.example.com"]
        fs-read  = ["/etc/svc/config"]
        spawn    = []
        db       = true
    ]
    _={ ... }=
</>
```

- Pro: visually identical to the manifest aggregate; emphasizes "this IS a capabilities table, scoped
  to this program."
- Con: introduces a NEW in-`<program>`-body block construct (not an attribute) — less cohesive with the
  `<program>` attribute surface; `<program>` config has always been attributes (`lang=`, `db=`, `route=`),
  never an embedded TOML-ish block. Heavier under the fingers.

**PA recommendation: Form A.** It's the cohesive, falls-under-fingers form (an attribute among
attributes), it keeps the V1 authoring surface tiny, and the manifest aggregate (Form-B-flavored) is the
DEFERRED view anyway — so Form A for authoring + the deferred `scrml.toml` `[capabilities]` table for the
central audit is the clean split. The draft below is written in Form A; swapping to B is a localized edit.

---

## §B — SPEC text (Form A; paste-ready)

### New subsection: §23.5 Capability Declaration (Nominal / spec-ahead)

> **Nominal — spec-ahead-of-implementation (V1 AUTHORING half).** This section specifies the
> capability-DECLARATION surface (the authoring habit) that ships in scrml-language v1.0. The
> capability-ENFORCEMENT layer (a manifest-declared, kernel-enforced sandbox parameterized from the
> declared set) is DEFERRED — gated until multi-tenant `_{}` execution is live (the "Pole-D" hybrid).
> The declaration is non-breaking-forward by construction: code that declares its capabilities today is
> unaffected when enforcement lands; enforcement reads the already-declared set. This is what makes
> "secure-by-design, hardening-in-progress" an honest claim rather than a promise — the declaration
> habit is real now; it composes with the already-real no-ambient-authority stdlib (import-only; no
> ambient `Math`/`fetch`/`fs`).

#### §23.5.1 Overview

A `<program>` that governs foreign code (`_{}` blocks, §23.2; WASM sigils, §23.3; sidecars, §23.4)
MAY declare the set of host capabilities that foreign code is INTENDED to use, via a `capabilities=`
attribute. The declaration is a co-located, author-visible contract: "this foreign-code scope is meant
to reach the network / read these files / spawn processes / touch the database / read env — and nothing
else."

In v1.0 the declaration is **advisory** — the compiler does not (and structurally cannot, per the
§23.2.3 opacity rule) verify that the foreign code stays within its declared set. What v1.0 DOES is nudge
the declaration HABIT (§23.5.5) and fix the surface so that enforcement is a later, additive,
non-breaking flip.

#### §23.5.2 The `capabilities=` attribute

`capabilities=` is a `<program>` attribute (§4.12.2). Its value is a bracketed list of **capability
tokens**:

```
capabilities-attr ::= 'capabilities=' '[' capability-token (',' capability-token)* ']'
                    |  'capabilities=' '[' ']'                       // explicit empty = declare-nothing
capability-token  ::= arg-cap '(' string-literal (',' string-literal)* ')'   // network/fs-read/fs-write/spawn/env
                    |  arg-cap                                       // arg-cap with no args = the capability with an empty allow-list
                    |  'db'                                          // presence-only (boolean)
arg-cap           ::= 'network' | 'fs-read' | 'fs-write' | 'spawn' | 'env'
```

- `capabilities=[]` is the explicit default (declare-nothing). An omitted `capabilities=` attribute is
  equivalent to `capabilities=[]` (§23.5.4).
- A capability token MAY repeat with additional args; the args UNION
  (`capabilities=[network("a.com"), network("b.com")]` ≡ `network` allowing `{a.com, b.com}`).
- An arg-bearing cap with no parens (`spawn`, `network`) declares the capability with an EMPTY
  allow-list — "this scope spawns / reaches the network, hosts/paths unspecified." (v1.0 records intent;
  the allow-list gains teeth at enforcement.)

#### §23.5.3 The capability vocabulary

| Capability | Arg shape | Meaning (the host surface declared) |
|---|---|---|
| `network(host…)` | host string-literals | outbound network (sidecar HTTP/socket, `fetch`-equivalent) to the named hosts |
| `fs-read(path…)` | path string-literals | filesystem READ under the named paths |
| `fs-write(path…)` | path string-literals | filesystem WRITE under the named paths |
| `spawn(cmd…)` | command string-literals | subprocess spawn (the sidecar-launch surface; §23.4) of the named commands |
| `env(name…)` | env-var-name string-literals | environment-variable READ of the named vars |
| `db` | (none — boolean) | database access via `?{}` in this scope (§8 / §44) |

The vocabulary is CLOSED in v1 (these six). Future SPEC extensions MAY add capabilities additively;
an unrecognized capability token SHALL be a compile error (`E-FOREIGN-CAPABILITY-UNKNOWN`, §23.5.7 —
NAMED, lands WITH the parser recognition per Rule 4).

#### §23.5.4 Capability determination (inheritance) — mirrors §23.2.1

The declared capability set governing a `_{}` block (or WASM sigil, or sidecar) is resolved exactly as
`lang=` is (§23.2.1): the compiler walks up the `<program>` nesting tree; the **closest ancestor
`<program>` with a `capabilities=` attribute wins**. If no ancestor `<program>` declares
`capabilities=`, the governing set is the **empty set** (`[]`) — declare-nothing.

```scrml
<program capabilities=[network("api.example.com")]>     <!-- app-scope: network only -->
    <program name="svc" lang="go" capabilities=[fs-read("/etc/svc"), spawn]>
        _={ /* governed by fs-read + spawn — the CLOSEST capabilities= wins; does NOT union the outer network */ }=
    </>
    <program name="probe" lang="ts">
        _={ /* no own capabilities= → inherits the closest ancestor's: network("api.example.com") */ }=
    </>
</>
```

> **Normative — closest-wins, no union (mirrors §23.2.1 `lang=`).** A nested `capabilities=` REPLACES
> the ancestor's set for its subtree; it does not union with it. This matches `lang=` determination and
> keeps each foreign scope's declared surface explicit and local. (The DEFERRED manifest aggregate is
> where the union-for-audit lives — §23.5.6.)

#### §23.5.5 `W-FOREIGN-UNDECLARED-CAPABILITY` — the presence-nudge lint

The compiler SHALL emit `W-FOREIGN-UNDECLARED-CAPABILITY` (Info-level lint, §34) when a foreign-code
construct (`_{}` block §23.2, WASM sigil §23.3, or `use foreign:` sidecar §23.4) is governed by an
**empty** capability set (no `capabilities=` on any ancestor `<program>`, or an explicit
`capabilities=[]`). The lint nudges the author to declare the scope's intended capability surface.

> **Opacity bound (§23.2.3) — presence, NOT accuracy.** Because the `_{}` interior is OPAQUE — the
> compiler does not parse, tokenize, or type-check it (§23.2.3) — the lint CANNOT and DOES NOT verify
> that the foreign code's ACTUAL host access matches its declared set. It checks DECLARATION-PRESENCE
> only: "this foreign scope reaches the host but declares no capabilities." Access-ACCURACY (does the
> code stay within the declared set?) is a property only the ENFORCEMENT layer can decide, and it does so
> at the C4 multi-tenant sandbox flip (§23.5.6) — the sandbox is parameterized FROM the declared set, so
> a declaration that under-states real usage fails CLOSED at enforcement, not at compile. v1.0's job is
> to make the declaration EXIST; v.next's job is to make it BINDING.

The lint is advisory (Info); it never blocks a build. An author who genuinely wants an undeclared
foreign scope suppresses it per §28 (`lint.foreign-undeclared-capability = off`).

#### §23.5.6 Deferred — the manifest aggregate + enforcement (NOT in v1.0)

The following are SPECIFIED-AS-DEFERRED so the v1.0 surface is forward-compatible, but are NOT
implemented or required by v1.0:

- **Manifest aggregate.** A compiler-derived `[capabilities]` view in `scrml.toml` (sibling of the
  §22.13 `[capabilities] host-import` entry and the §58.4 `[story]` table) that COLLECTS every
  `<program>`'s declared set into one central, audit-friendly manifest. The per-`<program>` declarations
  (§23.5.2) are the SOURCE; the manifest is the derived rollup. Rides the enforcement build.
- **Enforcement (Pole-D hybrid).** A manifest-declared, kernel-enforced sandbox that parameterizes the
  foreign-code execution environment FROM the declared capability set — so foreign code that exceeds its
  declaration fails closed at runtime. GATED until multi-tenant `_{}` execution is live (the threat model
  that motivates enforcement). The v1.0 declaration is the un-blocked precursor: enforcement reads the
  set v1.0 already taught authors to write.

#### §23.5.7 Error + lint codes (this section)

| Code | Severity | Fires when | Lands |
|---|---|---|---|
| `W-FOREIGN-UNDECLARED-CAPABILITY` | Info | a foreign-code construct is governed by an empty/undeclared capability set (§23.5.5) | WITH this section |
| `E-FOREIGN-CAPABILITY-UNKNOWN` | Error | a `capabilities=[…]` list contains an unrecognized capability token (§23.5.3) | WITH the parser recognition (Rule 4) |

Per pa.md Rule 4 (SPEC normative; codes land WITH the impl), the §34 catalog rows for both codes land in
the change that wires the `capabilities=` attribute recognition + the lint — mirroring §60/§61/§26.8's
named-codes-land-with-impl precedent. This Nominal section NAMES them; the impl wave catalogs + fires them.

### §4.12.2 attribute-table addition (Form A)

Add to the §4.12.2 "Nested `<program>` Attributes" table (and note it is valid on the top-level
`<program>` too, like `lang=`, since the top-level program can govern `_{}`):

| Attribute | Valid in nested? | Semantics |
|---|---|---|
| `capabilities=` | YES (and top-level) | Declares the intended host-capability surface for foreign code (`_{}` / WASM / sidecar) in this scope. Bracketed list of capability tokens (§23.5). Closest-ancestor-wins (§23.5.4). Advisory in v1.0 (`W-FOREIGN-UNDECLARED-CAPABILITY`); enforcement deferred. |

### §34 catalog rows (land WITH impl)

- `W-FOREIGN-UNDECLARED-CAPABILITY` — Info — foreign-code construct governed by an empty/undeclared
  capability set; declare the scope's intended capabilities (§23.5.5). Opacity bound: presence-nudge, not
  access-accuracy.
- `E-FOREIGN-CAPABILITY-UNKNOWN` — Error — `capabilities=[…]` contains an unrecognized capability token;
  v1 vocabulary is `{ network, fs-read, fs-write, spawn, env, db }` (§23.5.3).

---

## §C — Landing checklist (when ratified)

1. Confirm Form A (or swap to B) — the ONLY blocking input.
2. Insert §23.5 after §23.4 (before §24) — adjusts §24+ line ranges; regen SPEC-INDEX
   (`bun run scripts/regen-spec-index.ts`).
3. Add the §4.12.2 `capabilities=` row.
4. Add the §34 rows (Nominal-NAMED; fire WITH the impl wave).
5. Add the SPEC-INDEX Sections-table note + a Quick-Lookup topic row (`capability declaration → §23.5`).
6. Nominal SPEC-TEXT-ONLY landing (no compiler source) — the parser recognition + lint + the
   §34-catalog-and-fire is the follow-on impl wave (sPA-slot-able; mirrors §60/§61).
7. Cross-ref: §14.8.9 (the sibling Nominal discipline-forward security section), §22.13 (the manifest
   `[capabilities]` table this aggregates into, deferred), §23.2.3 (the opacity bound), §23.2.1 (the
   inheritance model mirrored).

## §D — Provenance / notes for the landing PA

- The `[capabilities: [...]]` notation in the deep-dive + delta-log [230] was CONCEPTUAL shorthand
  mirroring the TOML manifest table; the §4.12.2 attribute table makes `capabilities=` (Form A) the
  cohesive concrete surface. This draft surfaces both forms explicitly rather than silently picking the
  shorthand's literal spelling — the surface is the one adopter-facing call (memory:
  `feedback_cohesion_and_falls_under_fingers`, `feedback_show_code_to_reason_about`).
- This is the V1-security AUTHORING half ONLY. The "no-ambient-authority" half of the V1 security story
  is ALREADY REAL (import-only stdlib; no ambient `Math`/`fetch`/`fs`) — note that when writing the V1
  security-positioning statement (the owed companion artifact).
- C1 single-spawn-door (the sidecar-launch surface) is a security asset — guard it (delta-log [230]).
