# PA scrml Primer — what every PA must know about the language

**Purpose:** make the PA the second-foremost expert on scrml at session start, without having to re-derive base syntax + mindset across hundreds of thousands of context tokens. This file is mandatory reading at session start (see `pa.md`).

**Status:** living document. Updated when SPEC changes, when locks land, when patterns emerge. Treat as the canon snapshot at the listed date.

**Last updated:** 2026-05-06 (S64; reflects forgotten-surface audit findings — pipeline bookends + retired-AST-kinds-still-walker-handled. Earlier baseline: 2026-05-05 (S59; post-D1+D2+D3+D4 SPEC + L21 small-deliberation lock — Stage 0b complete, all S57 stdlib work + scrml:oauth, locks L1-L21))

**Word of caution:** if this primer disagrees with `compiler/SPEC.md` or `docs/articles/llm-kickstarter-v2-2026-05-04.md`, the SPEC + kickstarter are authoritative. Surface the contradiction.

---

## §1 The single most important framing

**scrml's UI of an application SHOULD be a fully-handled state machine.** In scrml's vocabulary that machine is called an **engine**. The structural shape of the UI tree IS the structural shape of the application's state. This is not aspiration; it is design intent.

But — apps don't START at the north star; they EVOLVE toward it. Booleans-as-lifecycle in early sketch code are not violations; they are in-progress pins. The compiler nudges via lints (`W-LIFECYCLE-CANDIDATE`, `W-MATCH-TRANSITIONS-ACCRUING`) but does not enforce. Forcing the north star punishes prototyping; we don't.

**The Tier 0/1/2 commitment ladder for case analysis on enums:**

| Tier | Form | What you get |
|---|---|---|
| 0 | `if=` chains / `${ if (...) lift ... }` | prototype, no exhaustiveness check |
| 1 | `<match for=Type [on=expr]>` block | structural exhaustiveness; rules-inert (with W-MATCH-RULE-INERT lint) |
| 2 | `<engine for=Type initial=.Variant>` | full deal: exhaustiveness + active rules + transition handlers |

**Promotion is mechanical and additive.** State-children carry forward verbatim from Tier 1 to Tier 2; the wrapper swap is the commitment moment.

---

## §2 The pillars (held since scrml8 era; locked at S55-S56)

1. **Markup is a first-class value type.** Markup elements may sit anywhere expressions sit — passed as args, stored in cells, returned from functions, on the RHS of `=`. Not a shortcut, not JSX-style sugar. Markup IS a value. (Lock L1.)
2. **State is the declaration primitive.** Reactive state cells `<x> = value` are the atomic unit. Everything declared as state is reactive by default.
3. **The compiler owns the wiring.** Server functions, routes, fetch calls, serialization, DOM wiring, async scheduling, and reactive dependency tracking are compiler concerns. The developer writes no boilerplate for these.
4. **One file type.** `.scrml` is the only source format. Logic, markup, style intermingle; the compiler decomposes them.
5. **All scrml should be scrml.** No bespoke per-state-type mini-DSLs. Every body that accepts content accepts the universal scrml grammar. Per-kind extensions (transitions, DDL, `@shared`) ride ON TOP of the universal base, not INSTEAD of it.
6. **Goal: bullet-proof apps.** A shipped scrml app should be essentially bullet-proof — every reachable state has UI, every transition is intentional, every effect runs at the right moment. **And** the developer should (almost) not realize they're making the app exhaustively provable. Provability falls out of the language's natural shape, not from separate proof ceremony.

---

## §3 V5-strict access — the access principle (§6.1)

scrml has TWO access forms for reactive state cells. Internalize this; it threads through every example.

| Form | Where |
|---|---|
| `<varname>` (structural) | declaration site, render-by-tag in markup, engine state-child tags |
| `@varname` (canonical expression access) | reads, writes, compound assignments |

**Bare names in expressions are LOCAL identifiers only.** They do NOT resolve to reactive state. `<count> = 0; let count = 5;` is `E-NAME-COLLIDES-STATE` — locals cannot shadow registered state names.

Why two forms: every state touch is visually distinguishable from local-variable touch. The reader can scan a function body and instantly count "how many state cells does this read or mutate." Load-bearing for the exhaustiveness goal.

**`@` is NOT a JS-framework concession.** It is the canonical, semantically-required marker. The pre-S55 framing of `@` as "sugar" is superseded.

---

## §4 The three RHS shapes for state declarations (§6.2)

Every state cell's right-hand side is one of three shapes.

**Shape 1 — plain reactive cell.** RHS is a literal or expression value. No render-spec. Display via `${@x}` interpolation only.

```scrml
<count> = 0
<name>  = ""
<items> = []
```

**Shape 2 — decl-coupled-with-render-spec.** RHS is bindable markup. Validators ride as bare attributes on the decl. `<varname/>` in markup expands to the bound input element with appropriate `bind:value`/`bind:checked` dispatch.

```scrml
<userName req length(>=2)> = <input type="text"/>
<agree    req>             = <input type="checkbox"/>
```

**Shape 3 — derived (read-only).** `const` modifier; RHS is an expression that recomputes on dep change. Markup-typed derived cells are legal under L1.

```scrml
const <doubled>     = @count * 2
const <greeting>    = "Hello, " + @userName
const <badge>       = <span class="badge">${@userName}</span>   // markup-typed
```

`<derivedName/>` in markup with a non-markup-typed derived cell is `E-CELL-NO-RENDER-SPEC`.

**Optional `default=` attribute** — any cell may declare an explicit reset target: `<startTime default=null> = Date.now()`.

---

## §5 Compound state — Variant C (§6.3)

Ad-hoc compound state uses structural-children. Field access via canonical dot navigation.

```scrml
<formRes>
    <name>  = ""
    <email> = ""
    <error> = ""
</>

// Read: @formRes.name, @formRes.error
// Write: @formRes.name = "alice"
```

Tier 3 predefined-shape compound (positional sugar legal):

```scrml
type UserInfo:struct = { name: string, age: number, active: boolean }
<userInfo>: UserInfo = ("alice", 30, true)
```

Positional binding is legal ONLY when the structure is fixed by a predefined type. Ad-hoc compound state must use structural-children form.

---

## §6 The error model — `fail` / `!{}` (NOT try/catch)

**try/catch is not in scrml's vocabulary.** Public claim. Surface a retraction if anyone slips and uses it.

scrml uses **failable functions** + **call-site `!{}` handlers**:

```scrml
type LoadError:enum = {
    Network(msg: string)
    Empty
}

server function fetchItems()! -> LoadError {
    const result = ?{ select * from items }
    if (result.length == 0) fail LoadError::Empty
    return result
}

function load() {
    const rows = fetchItems() !{
        | ::Network msg -> { @phase = .Error(msg); return }
        | ::Empty       -> { @phase = .Empty;       return }
    }
    @phase = .Success(rows.length)
}
```

Pattern:
- `function name(args) ! ErrorType { ... }` declares failable
- `fail .Variant(args)` surfaces the error
- `let x = call() !{ | ::Variant arg -> { ... } }` exhaustive call-site handler

**Errors-as-states is the canonical lifting:** at Tier 1+, the `!{}` handler at the call site does one thing — route each error variant into the right Phase variant. The error becomes a state in the Phase enum. `<isError>` + `<errorMsg>` cells are anti-patterns; the failure modes live in the type.

---

## §7 Engines (Tier 2) — the centerpiece (§51)

Engines are the v0.next centerpiece. Singleton-by-design (one declaration mounts the singleton; cross-file mount via `<EngineName/>`). Components are the multi-instance vehicle (Move 20 — components and engines are distinct, do not collapse).

```scrml
type Phase:enum = { Idle, Loading, Error(msg: string), Empty, Success(count: int) }

<engine for=Phase initial=.Idle>

    <Idle>
        <button rule="load -> Loading">Load</button>
    </>

    <Loading rule="onResult.ok(n) -> Success(n)"
             rule="onResult.err(m) -> Error(m)"
             rule="onResult.empty -> Empty">
        Loading...
    </>

    <Error msg>
        <div>${msg}</div>
        <button rule="retry -> Loading">Retry</button>
    </>

    <Empty>
        No rows yet.
    </>

    <Success count>
        Got it: ${count} rows
    </>

    <onTransition from=Loading to=Success>
        ${ analytics.track("load.success") }
    </>

</>
```

Key engine concepts:
- **Auto-declared engine variable** — first `<engine for=Phase>` in a scope auto-declares `<phase>` (lowercase first-letter of type, Move 16). Manual override via `var=<name>`.
- **Mount position = decl position.** Same-file decl-IS-mount; `<EngineName/>` for cross-file mount of a shared singleton.
- **`initial=`** required (W-ENGINE-INITIAL-MISSING lint defaults to first variant if omitted; forbidden on derived engines).
- **`rule="event -> Variant"`** the transition contract. Three forms: event-driven, predicate, wildcard.
- **`.advance(.event)`** is the only legal write path. `@phase = .Loading` direct writes bypass rules — `E-ENGINE-INVALID-TRANSITION`.
- **`<onTransition from=A to=B>`** for cross-state effects (analytics, cleanup).
- **`effect=` attribute** on rules for inline per-rule effects.
- **Derived engines** — `<engine for=Phase derived=expr>` reactively recomputes the variant; no rules, no writes (`E-DERIVED-ENGINE-NO-WRITE`).
- **Components are NOT engines** — a component-instance with internal state is fresh per instance; an engine is one app-lifecycle singleton (`E-COMPONENT-ENGINE-SCOPE`).
- **Legacy `<machine>` keyword** — deprecated alias for `<engine>`. Emits `W-DEPRECATED-001` at the call site; the `bun scrml migrate <file>` CLI auto-rewrites `<machine` → `<engine`. `W-DEPRECATED-001 → E-DEPRECATED-001` transition planned for v0.3.0.

---

## §8 Validators + auto-synthesized validity surface (§55)

Compound state with validators auto-synthesizes a reactive validity surface at TWO levels — compound rollup AND per-field — both reactive, both read-only.

```scrml
<signup>
    <name  req length(>=2)>           = <input type="text"/>
    <email req email>                 = <input type="email"/>
    <agree req>                       = <input type="checkbox"/>
    const <displayName> = @signup.name.toUpperCase()
</>

// Auto-synthesized (read-only):
//   @signup.isValid       boolean rollup
//   @signup.errors        compound-level errors array
//   @signup.touched       any field touched yet?
//   @signup.submitted     was first submit attempted?
//   @signup.name.isValid  per-field
//   @signup.name.errors   per-field (enum tags from ValidationError, NOT strings)
//   @signup.name.touched  first interaction
//   @signup.email.isValid ...
```

**Universal-core predicate vocabulary** (§55.1) — same word at compile site and runtime:

`req`, `is some` (existence-check, scrml's null+undefined unification), `length(<rel-arg>)`, `pattern`, `min`, `max`, `gte`, `lte`, `eq`, `oneOf`, `email`, `url`, `numeric`, `integer`, `custom`.

**Errors are enum tags, not strings.** `@signup.name.errors[0]` is `.Required` or `.TooShort(2)` — consumers pattern-match on the tag.

**4-level error message resolution chain** (§55.5, L12):
1. Inline on decl (`<name req:"Please enter your name">`)
2. Project-registered (a project-level message catalog)
3. `scrml:data` defaults (English)
4. Match escape hatch (`<match for=ValidationError>`)

**`<errors of=expr/>`** first-class element renders errors per-cell or rollup. `all` attribute toggles full-array vs first-error rendering.

**Cross-field validation** via predicate args with cross-cell expressions: `<confirm req eq(@signup.password)>` — no separate vocabulary. (L14.)

**Validators on derived cells** are forbidden (`E-DERIVED-WITH-VALIDATORS`); use refinement-type predicates at the type level instead.

---

## §9 Channels, schema, predicates, `not` keyword (Stage 0b D3 — LANDED S58)

D3 landed S58 — `compiler/SPEC.md` §38 / §39 / §42 / §53 / §34 are now authoritative.

### §9.1 Channels (§38) — file-level, V5-strict, no `@shared`

```scrml
<channel name="chat" topic="lobby">
  <messages> = []                                    // V5-strict — auto-syncs across clients

  server function postMessage(author, body) {
    @messages = [...@messages, { author, body, ts: Date.now() }]
  }
</>

<program>
  ${ const count = @messages.length }                // cross-scope canonical access
</>
```

- Channels live at **file level** (sibling of `<program>`, never child). `E-CHANNEL-INSIDE-PROGRAM`.
- `@shared` modifier is **REMOVED** in v0.next. `E-CHANNEL-SHARED-MODIFIER`. Auto-sync comes from being inside the channel body, not from a modifier.
- Channel body uses **V5-strict** (§6). `<x> = init` declares a channel-scoped reactive cell auto-synced across subscribed clients.
- Auto-creates WS endpoint `/_scrml_ws/<name>`; `topic=` defaults to `name`.
- Auto-injected in server functions: `broadcast(data)`, `disconnect()`.
- Channel-declared cells reachable from `<program>` via canonical `@cellName` access.
- Handler attribute params (`onserver:message=handler(msg)`) — `msg` is a function-local LOCAL, accessed bare. V5-strict locals semantic; not state.

### §9.2 Schema (§39) — SQL-mirror canonical + additive shared-core (L4)

```scrml
<schema>
  users {
    email: text not null unique          // SQL-mirror native — canonical source-level
    name:  text req length(>=2)          // shared-core additive — req lowers to NOT NULL
    age:   integer min(18) max(120)      // shared-core additive — lowers to CHECK constraints
  }
</>
```

- SQL-mirror (`not null`, `unique`, `references(table.col)`, `default(literal)`, `primary key`) remains **canonical**.
- Shared-core (`req`, `length`, `pattern`, `min`, `max`, `gt`, `lt`, `gte`, `lte`, `eq`, `neq`, `oneOf`, `notIn`) is **additive**. Both forms legal; mixed is legal.
- Lowering rules (§39.5.8): `req → NOT NULL`; `length(>=N) → CHECK (length(col) >= N)`; `pattern(re) → CHECK (col REGEXP …)` driver-dependent (Postgres `~`, SQLite/MySQL `REGEXP`); `min/max/gt/lt/gte/lte/eq/neq → CHECK`; `oneOf([...]) → CHECK (col IN (...))`.
- **Inviolable:** SQL strings sent to the database are unchanged in shape. Vocabulary unification touches scrml source-level only.
- Cross-locus consistency: same shared-core word fires in three contexts — state validator (§55, reactive), refinement type (§53, compile + boundary), schema column (here, DBMS-enforced).
- SQL passthrough (`?{}` blocks) remains **inviolable**.
- **Schema-to-migration-SQL diff lives in `compiler/src/schema-differ.js`** (~273 LOC). Compares desired (`<schema>` AST) vs actual (`PRAGMA table_info()` output); emits migration SQL. Live during dev-mode reload. The diff algorithm is invisible at the §39 spec level — when dispatching schema-evolution work, read schema-differ.js directly.

### §9.3 Predicates (§53) — refinement-type cross-ref (L4)

```scrml
<email>: string(pattern(/^[^@]+@[^@]+$/)) req = <input type="email"/>
//        ────── refinement type (compile-time + runtime boundary)
//                                              ── state validator (reactive form-validity)
```

- Shared-core vocabulary appears in refinement types as predicates on type annotations.
- Firing semantics: compile-time + runtime boundary check. A non-conforming value cannot inhabit the type. **Stronger** than state validators (runtime-only-reactive) and schema constraints (DBMS-enforced).
- Type predicate + state validator stack as **independent enforcement layers**. They compose cleanly.

### §9.4 `is some` vs `req` (§42.2.5) — distinct predicates (L5)

| Predicate | Semantics | `""` (empty string) |
|---|---|---|
| `is some` | value EXISTS (null/undefined fail) | TRUE — empty string IS some value |
| `req` | value is NON-EMPTY / MEANINGFUL | FALSE — empty string fails req |

Both predicates exist; both are needed; they coexist in the validator vocabulary. **Three native loci** of "exists/required" semantic across scrml: schema SQL-mirror (`not null`), state validator (`req` and/or `is some`), refinement type (predicate form). Each fires in its layer's enforcement context — not redundancy.

### §9.5 `not` keyword

(Move 11 — pinned-style modifier on imports / decls for opt-out semantics. Existing §42 content retained.)

### §9.6 D4 — small-edit threading + cross-file imports + structural elements registry

D4 (S58 close) threaded the locks/moves across the smaller spec sections. Highlights worth knowing:

- **Cross-file engine import** (§21.8, M18). `import { MarioMachine } from './engines.scrml'` then mount via `<MarioMachine/>` at use-sites. Singleton semantics across all use-sites in the importer's file. `pinned` legal on imports: `import { MarioMachine pinned } from './engines.scrml'`.
- **Components vs engines** (§15.13.5, M20). Singleton-by-design (`<engine>`) ≠ multi-instance (component). Component bodies cannot instantiate an engine — `E-COMPONENT-ENGINE-SCOPE`.
- **Structural elements registry** (§4 + §24). `<engine>`, `<match>`, `<errors>`, `<onTransition>` are scrml-defined structural elements (NOT HTML). `E-STRUCTURAL-ELEMENT-MISPLACED` if used in unsupported contexts.
- **Bare-variant inference** (§14.10, M9). When LHS or parameter type is statically known, the variant qualifier may be omitted: `<phase>: Phase = .Idle` not `Phase.Idle`. Union-typed contexts → ambiguous → require qualification.
- **`:`-shorthand body** (§4.14, M15). Single-expression body: `<Idle>: <button onclick=load()>Load</button>`. Whitespace mandatory after `:`.
- **Multi-statement handler restriction** (§5.2.3, L19). Inline event handlers may be a bare call, bare assignment, or bare single expression. Multi-statement handlers force a named function. `E-MULTI-STATEMENT-HANDLER`.
- **`scrml:data` `registerMessages`** (§41.12, L12). `data.registerMessages({.ErrorTag: (field, ...args) => string, ...})` — project-wide once-at-boot for i18n + brand-voice. The "project-registered" tier of the 4-level error message chain.
- **+7 error codes** added in §34 (D4 Tier 9 consolidation): `E-CLOSER-001`, `E-NAME-COLLIDES-RESERVED`, `E-STRUCTURAL-ELEMENT-MISPLACED`, `E-MULTI-STATEMENT-HANDLER`, `E-IMPORT-PINNED-INVALID`, `E-DERIVED-CIRCULAR-DEP`, `E-USE-INVALID-CTX`.

---

## §10 stdlib — what's on the shelf (16 modules)

**Important:** stdlib modules are **import-only**, not standalone-compile targets. Don't try to compile `stdlib/<x>/index.scrml` directly — it's designed to be imported into a `<program>`.

**App-building primitives:**
- `scrml:auth` — `hashPassword`, `verifyPassword`, `signJwt`, `verifyJwt`, `decodeJwt`, `createRateLimiter`, TOTP (generate/verify)
- `scrml:oauth` (NEW S58) — OAuth 2.0 + PKCE (RFC 7636). Core: `startFlow`, `exchangeCode`, `refreshToken`, `getUserInfo`, `revoke`. PKCE: `generateVerifier`, `deriveChallenge`. Storage: `memoryAdapter()` (dev only); caller injects production adapter. Provider presets: `googleConfig` + `parseGoogleIdToken` (decode-only, no JWKS verify yet — v0.3.0), `githubConfig`, `microsoftConfig`, `discordConfig`. Typed errors caught by `err.name`: `OAuthStateMismatch`, `OAuthVerifierMissing`, `OAuthTokenError`, `OAuthUserInfoError`, `OAuthRevocationError`. **Deferred:** JWKS sig verification, OIDC discovery (RFC 8414).
- `scrml:data` — `validate(data, schema)`, `isValid`, `firstError`; predicate builders; transforms (`pick`, `omit`, `groupBy`, `sortBy`, `unique`, `flatten`, etc.) — vocabulary alignment task pending B3
- `scrml:router` — `match(pattern, path)`, `parseQuery`, `buildUrl`, `navigate`, `currentPath`, `onNavigate`
- `scrml:store` — `createStore`, `createSessionStore`, `createCounter` (KV / session via SQLite)

**Network + scheduling:**
- `scrml:http` — REST helpers (`get/post/put/del/patch`) + `withBaseUrl/withAuth/withDefaults`, `retry(fn, opts)`, `multipart`, `uploadFile`, `isOk`/`isError`. All async.
- `scrml:redis` — `get/set/setex/del/exists/expire/ttl/incr/decr`; sets `sadd/srem/sismember/smembers`; pub/sub `publish/subscribe/unsubscribe`; `createClient`, `send`, `close`. Bun.redis-backed.
- `scrml:cron` — `schedule(pattern, handler)` returns CronJob; `nextOccurrence`, `stop`. Bun.cron-backed (Bun ≥1.3.12).

**Crypto + format + patterns:**
- `scrml:crypto` — `hash`, `verifyHash`, `hmac`, `safeCompare`, `generateUUID`, `generateToken`
- `scrml:format` — `formatCurrency/Number/Percent/Bytes`, `slug`, `pluralize`, `titleCase`, `capitalize`, `toWords`, `truncate`, `padLeft/Right`, locale-aware Intl: `compactNumber`, `formatList`, `formatRange`, `formatNumberAdvanced`
- `scrml:time` — `formatDate/Time/DateTime/Relative/Duration`, `parseDate`, `isValidDate`, `startOf/addTime/diffTime`, `debounce/throttle/sleep`; timezone: `formatInTimezone`, `nowInTimezone`, `toTimezoneParts`, `tzOffset`; ISO: `formatISO`, `parseISO`
- `scrml:regex` — vetted `patterns` catalog (email, url, ipv4, uuid, slug, hexColor, semver, isoDate, phoneE164, usZip, etc.); helpers `test`, `match`, `extract`, `replace`, `escape`, `caseInsensitive`, `isValid(name, str)`

**Wrappers:**
- `scrml:fs`, `scrml:path`, `scrml:process`, `scrml:test` — Node compat / test runner

**Distribution model (locked S57):** bundled-with-compiler, single-version, stdlib-version = compiler-version, no registry, no separate semver.

**Honesty positioning:** "kills ~88-90% of typical-app npm needs" (S58 lift after `scrml:oauth` lands). Real remaining gaps: JWKS / OIDC discovery (deferred); date-formatting beyond Intl; advanced HTTP middleware beyond what's bundled; some niche utility libs (lodash-equivalents).

**No generics** — scrml doesn't have type parameters. Recurring finding: per-domain enums + per-screen state-machine variants beat generic stdlib types like `AsyncPhase<T>` — naming the variants in app context produces better match blocks. The five-line "boilerplate" is five lines of useful domain spec.

---

## §11 Frequent anti-patterns (kickstarter §7, agent-trip-up list)

What LLMs reflexively reach for + the scrml form:

| Reflex | Why wrong | scrml form |
|---|---|---|
| `useState`, `ref`, `signal()` | scrml has no hook calls | `<x> = 0` declares; `@x` reads |
| `useEffect`, `watchEffect` | no effect hooks | Reactive `${...}` blocks; `<onTransition>` for engine effects |
| `try { ... } catch (e) { ... }` | not in scrml | `function f()! -> Err { fail Err::V(...) }` + `let x = f() !{ \| ::V → ... }` |
| `if (errors.length > 0)` | manual error checking | `@form.isValid` (auto-synth); `<errors of=@form.field/>` |
| `bcrypt.hash(pwd, 10)` | npm import | `import { hashPassword } from 'scrml:auth'` |
| `===`, `!==` | scrml is strict-by-default | `==`, `!=` (E-EQ-004) |
| `throw new Error(msg)` | not in scrml (§19) | `fail SomeErr::Variant(msg)` |
| `function reset() {}` (local) | `reset` is reserved | Use a different name; `reset(@cell)` is the keyword |
| Local var named after a state cell | shadows state | E-NAME-COLLIDES-STATE; rename the local |
| `<x>: SomeEnum = SomeEnum.Variant` | redundant prefix | `<x>: SomeEnum = .Variant` |
| `match` without exhaustiveness | scrml requires it at Tier 1+ | E-MATCH-NOT-EXHAUSTIVE; cover every variant or use `_` wildcard |
| Inline multi-statement event handler `onclick={ doA(); doB() }` | inline form is bare-call/bare-assignment/bare-single-expression only | E-MULTI-STATEMENT-HANDLER; extract to a named function and call it |
| Importing across files without `pinned` when forward-ref is needed | forward-references through imports require `pinned` to lift the cycle | E-IMPORT-PINNED-INVALID; add `pinned` modifier to the import |
| Engine instantiated inside a component body | components are multi-instance, engines are singleton — they don't compose | E-COMPONENT-ENGINE-SCOPE; declare the engine at file/program scope and mount via `<EngineName/>` |
| `@derivedArr.push(x)` / `@derivedObj.foo = x` on a `const`-derived cell | derived cells are value-immutable from the developer's perspective; the mutation would be silently clobbered next time upstream deps fire | E-DERIVED-VALUE-MUTATE (§6.6.18); mutate the upstream cell instead (`@items = [...@items, x]`) or declare a separate mutable cell |

---

## §12 Operational rules (orientation, not language)

- **Pre-commit hook** runs `bun test` (excluding browser). Never bypass with `--no-verify` without explicit user authorization. ~7,800-8,800 tests pass; 0 failures is the contract.
- **Cherry-pick + push protocol** — see pa.md §"Cross-machine sync hygiene" + §"wrap" definition.
- **Worktree path discipline** — agent dispatches with `isolation: "worktree"` may construct main-rooted paths from intake docs by mistake; brief must paste the absolute worktree path explicitly; agents must run `pwd` at startup.
- **Agent-file edits don't propagate mid-session** — if you edit `~/.claude/agents/<name>.md`, the change takes effect at the NEXT PA session, not the current one. Plan accordingly.
- **scrml-dev-pipeline tool set** (post S57): `Agent, Read, Write, Edit, Glob, Grep, Bash`. Default model `opus`. Edits to this file took effect S58+; before that, the agent's tools were limited and dispatches needed careful brief design.
- **SPEC.md size** (post-D4): **~24,382 lines / ~410k tokens**. Past the size where Read+Write full-file-overwrite is feasible; Edit's diff-form scales fine. Per-section split queued as v0.3.0+ candidate (see IMPLEMENTATION-ROADMAP.md §8.5).
- **PIPELINE.md size** (post-D4): ~2,380 lines (1,941 → 2,380; 22.6% rewrite). Per-stage v0.next addenda landed: TAB / NR / MOD / UVB / TS / DG / CG. Integration Failure Mode Catalog +11 v0.next entries. **Follow-up prose pass deferred** (IMPLEMENTATION-ROADMAP.md §8.6 #2) — addenda are stitched, not re-flowed; engineering content complete.
- **`const @x` → `const <x>` sweep DONE (S58)**. Two-phase cleanup: (a) §6 sweep (62 edits) replaced declarations within §6 itself; (b) follow-up cleanup across §11/§12/§22/§23/§34/§52 (13 more edits). SPEC.md now has zero `const @x` declarations. Canonical form `const <x> = expr` is universal. Read sites still use `@x` (canonical access).
- **`bun install` required in fresh worktrees**: pre-commit `bun test` fails with "cannot find package 'acorn'" in newly-spawned worktrees because node_modules doesn't inherit from main. Hit by every D2.8/D3/oauth/D4 dispatch this session. Workaround: `bun install` once at worktree startup. Worth a pa.md F4 addendum or a worktree-setup hook (deferred).
- **`bun run pretest` required in fresh worktrees** (S59 rev-1 finding): browser tests load from `samples/compilation-tests/dist/` which is gitignored. Without `bun run pretest`, full `bun test` produces ~130 ECONNREFUSED-shaped failures in happy-dom. Use `bun run test` (chains pretest) NOT `bun test` directly for baseline checks. Documented in pa.md F4 step 5.
- **SPEC.md Read-budget reality (S64 amendment).** SPEC.md is ~410k tokens. Primer + SPEC-INDEX.md + targeted-section Read is the only sustainable pattern. Never attempt full-file Read (will overflow). For lookups: `grep -n "^### " compiler/SPEC.md` for top-level headings, then targeted Read with `offset:` + `limit:`. SPEC-INDEX.md (~288 lines) is the navigation map. Per-section split queued as v0.3.0+ candidate.
- **Adding a new scrml-special structural element (S64 amendment)** — e.g., a new structural element added at SPEC §4/§24 — REQUIRES updating `compiler/src/attribute-registry.js` (~233 LOC, defines per-element attribute schemas) for VP-1 (attribute-allowlist.ts) and VP-3 (attribute-interpolation.ts) validation. Otherwise unknown attributes are silently forwarded as HTML. PIPELINE.md 0.7.0 §3.3 calls this out at the stage-contract level; the dispatch checklist must enforce it.
- **Self-host integration shim (S64 amendment).** `compiler/src/codegen/compat/parser-workarounds.js` exposes `setBPPOverrides(mod)` — runtime override hook that swaps in self-hosted BPP module implementations when available. Live in self-host integration. Without context, the shim looks like dead-code-with-getter; it isn't.
- **Open SPEC-ISSUE registry (S64 amendment, scattered in SPEC prose).** Discoverable via `grep -ohE 'SPEC-ISSUE-[0-9]+' compiler/SPEC.md | sort -u`. As of 2026-05-06: **005** (HTML version target), **010-COMPONENT** (component overloading; pinned for queued debate-03), **012** (Tailwind variants/theming), **018** (SQL transactions), **025-027** (server `@var` initial-load semantics), §53.13.1-4 (named-shape registry, constraint arithmetic, type-alias for predicates, boolean predicates). 010-FUNCTION closed-without-resolution (debate-02 verdict). 013 closed 2026-03-27.
- **Pipeline has TWO bookends the named-stage list doesn't show (S64 audit finding):**
  - **Pre-Stage-2 lint pass** — `compiler/src/lint-ghost-patterns.js` (~492 LOC) runs BEFORE Stage 2 BS. Scans for React/Vue/Svelte syntax and emits "did you mean?" warnings. The §11 anti-patterns table above is enforced at *both* doc-level AND lint-level by this pass. Catalog source: `scrml-support/docs/ghost-error-mitigation-plan.md`.
  - **Post-TAB diagnostic walkers** — `compiler/src/gauntlet-phase[1|3]-checks.js` (~1226 LOC total) emit a class of diagnostics AFTER the named pipeline stages: import/scope/use-decl placement (E-IMPORT-001/003, E-SCOPE-010, E-USE-001/002, E-USE-INVALID-CTX) + equality / null-token misuses (E-EQ-002/004, E-SYNTAX-042). When dispatching diagnostic-fix work, **search both `type-system.ts` AND these gauntlet files** — the diagnostic source may not live in the named stage you'd expect.
- **Internal AST kinds retired but still walker-handled (S64 audit finding):** `reactive-derived-decl`, `reactive-debounced-decl`, `reactive-array-mutation`, `reactive-explicit-set`, `reactive-nested-assign` are defined in `compiler/src/types/ast.ts` with `@deprecated Phase A1a Step 11.5 — RETIRED ... S60`. Folded into `state-decl` at S60. The parser no longer constructs them but ~10 walker files retain pattern-match arms for backwards compatibility. **Do NOT extend or use them in new dispatch code.** Phase 4d completion sweep (P1 v0.2.0) drops the kinds + prunes the arms — companion cluster: ~30 `@deprecated Phase 4d` `string` shadow fields on ~20 AST interfaces (`init?: string`, `condition?: string`, etc.) sitting next to `*Expr?: ExprNode` fields that are the live form. See `docs/audits/compiler-forgotten-surface-2026-05-06.md` §1.5 + §2.1 for full inventory.
- **Depth-of-survey discount (S59 captured)**: when an audit estimates >5h for a "new-infrastructure" fix, mandate an implementation-time survey-first phase before accepting the estimate. The survey routinely cuts cost 2-5x because existing infrastructure often partially covers the perceived gap; the actual fix is a localized extension, not new infrastructure. **Four confirmed occurrences (S59):** S51 W2 (LSP already shipped canonical-key + auto-gather; CE was the outlier), S52 DD4 (SPEC §54.2-§54.3 already had the extension-point pattern), S59 Step 2 (block-splitter already preserves raw `<` content correctly; intervention was one helper in ast-builder.js, not multi-subsystem rework — agent finished in ~21 min vs the audit's 10-15h estimate), S59 documentary-attrs (brief named `emit-html.ts` as touchpoint; survey corrected to `codegen/index.ts:530-555`; ALSO surfaced two unanticipated touchpoints `attribute-registry.js` + `html-elements.js` for validator allowlist). The fourth instance validates that the discount applies to brief-locus errors as well as architectural-cost errors — implementation-time survey routinely reveals the actual surface area is different from what the brief named. Full pattern + mitigations + counter-cases at `scrml-support/design-insights.md` "Depth-of-survey discount" entry. Mitigation checklist: (a) for each gap row in an audit OR each touchpoint in a brief, ask "what existing infrastructure partially covers this?" + "is this REALLY the right file?"; (b) add cost-estimate confidence intervals ("Xh IF new-infra-needed; ≤Yh IF existing-infra covers"); (c) PA dispatches a 1-2h survey-only diagnostic agent before per-step decomposition when in doubt; (d) brief MUST authorize agents to correct the touchpoint when survey reveals the brief is off — no "stick to the named file" rigidity.

---

## §13 The locks (L1-L20) — at-a-glance

Captured in full at `scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`. Quick reference:

| # | Lock |
|---|---|
| L1 | Markup-as-first-class-value (PILLAR — held since scrml8) |
| L2 | Compound state Variant C with canonical `@formRes.name` access |
| L3 | Decl-coupled-with-render-spec (`<name req> = <input/>`) |
| L4 | Partial validator vocabulary unification (no bilingual schema) |
| L5 | `is some` reused from existing scrml primitive (coexists with `req`) |
| L6 | Match Tier 0/1/2 ladder |
| L7 | Match attributes (rules-inert + `effect=`/`<onTransition>` engine-only) |
| L8 | Two match shapes coexist (block-form + JS-style) |
| L9 | `loose` flag dropped (rules-in-match obviates) |
| L10 | `reset()` as primitive (superseded by L18) |
| L11 | Auto-derived validity surface (compound + per-field, errors as enum tags) |
| L12 | Validator error-message origin (4-level resolution chain) |
| L13 | `<errors of=expr/>` first-class element |
| L14 | Cross-field validation via predicate args (no separate vocabulary) |
| L15 | `const <derived> = expr` (extended ALL-SCOPE during S56 alignment pass) |
| L16 | Multi-render via existing access paths (no override syntax) |
| L17 | Compiler dispatches binding by render-spec; writable requires bindable |
| L18 | `reset(@cell)` keyword + `default=` attribute (γ semantics) — supersedes L10 |
| L19 | Multi-statement event handlers force named function |
| L20 | `derived=expr` engine attribute (any reactive expression of engine's type) |
| L21 | `E-DERIVED-VALUE-MUTATE` — in-place mutation of a `const`-derived cell forbidden (array mutating methods, object property writes / compound-assignment / `delete`, in-compound derived sub-cells). Sibling rename: §6.6.8 reassignment code E-REACTIVE-002 → E-DERIVED-WRITE. Spec at §6.6.18 + §34. (S59 small-deliberation lock, 2026-05-05.) |

---

## §13.5 Spec real-estate vs adoption — known slivers + doc-only surfaces (S64 audit)

The spec is ahead of adoption for several feature surfaces. Knowing which surfaces are sliver-empty or doc-only saves PA from dispatching work that has no real consumer or has nothing to delete.

| Surface | Status | Note |
|---|---|---|
| `^{}` meta-blocks | **active** (74+ sample/example files) | First-class; design + adoption both real |
| `_{}` foreign-code (§23, ~443 lines spec) | **sliver-empty** (0 source-level uses) | Design real, adoption pending. Treat foreign-code design questions as low-priority unless a specific WASM/sidecar use-case is in scope |
| `<keyboard>` / `<mouse>` / `<gamepad>` (§36, 358 lines spec) | **sliver-empty** (0 source-level uses, 1 unit test) | Spec real-estate exceeds adoption. §36 retention debate (debate-04 candidate) before extending. Trio (`match`/`engine`/derived) does NOT cover live-input dispatch — input events are inherently external |
| State-type-discriminated function-overloading (§17.5 first half) | **retired** (debate-02 verdict, S64) | Stage 0c.A deletes the implementation; replacement primitives are `match`/`engine`/derived |
| Component-overloading (§17.5 second half) | **DOC-ONLY in SPEC, never implemented** (S64 audit finding) | `component-expander.ts` has zero overload code paths. Stage 0c has nothing component-shaped to delete. SPEC-ISSUE-010-COMPONENT pinned for queued debate-03 (CLOSE / KEEP-OPEN-DEFER / DESIGN-AND-SHIP) |
| `<transaction>` block (§44.6, SPEC-ISSUE-018 open) | **stub** | Codegen has TODOs; spec defers full transaction syntax. Either close SPEC-ISSUE-018 + finish, or retire AST kind |
| `<machine>` keyword | **deprecated** (W-DEPRECATED-001) | `bun scrml migrate` rewrites to `<engine>`. Hard-removal at v0.3.0 |

**General principle:** when planning work touching one of these surfaces, check the row first. PA should not dispatch implementation work against a doc-only surface, and should not assume a sliver-empty surface has consumers.

---

## §14 What this primer does NOT cover (read elsewhere)

- Detailed grammar — see `compiler/SPEC.md` (the authoritative spec; ~24k lines / ~410k tokens — see §12 Read-budget reality)
- Section index — see `compiler/SPEC-INDEX.md`
- Recipes (auth, real-time, schema, etc.) — see `docs/articles/llm-kickstarter-v2-2026-05-04.md` §11
- Anti-patterns table for dev-agent dispatch — see `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- Compilation pipeline stages — see `compiler/PIPELINE.md` (and primer §12 for the two bookends not in PIPELINE.md)
- Implementation phase plan (Phase A1+) — see `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md`
- Forgotten-surface audit (vestigial features / fragile string paths / spec-vs-code drift / cross-pass invariants) — see `docs/audits/compiler-forgotten-surface-2026-05-06.md`

---

## §15 Update protocol

When SPEC changes substantively (a Stage 0b dispatch lands, a lock changes, a stdlib module is added/extended), update this primer in the same commit or shortly after. Hand-off should note "primer updated for X" so next-session PA knows the canon snapshot is fresh.

A primer that has fallen behind is worse than no primer — it teaches yesterday's language. Stale primers cost more in correction than they save in onboarding.
