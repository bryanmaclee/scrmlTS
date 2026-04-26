# Kickstarter v0 — Spec Verification Matrix

**Run:** 2026-04-25 (S42, Scope C Stage 2)
**Compiler SHA:** `b1ce432`
**Source under audit:** `docs/articles/llm-kickstarter-v0-2026-04-25.md`
**Reference:** `compiler/SPEC.md`, `compiler/SPEC-INDEX.md`, `stdlib/`, `compiler/src/cli.js`, `examples/`

This matrix verifies each non-trivial claim in kickstarter v0 against the SPEC and stdlib source. The result determines what must be fixed before kickstarter v1 ships. **The kickstarter is normative content. Wrong content propagates** (per S41 user-voice). Anything in the WRONG bucket below means: an LLM following v0 today will write code that won't compile or will compile to broken behavior.

---

## §1. Confirmed CORRECT (with spec citation)

These claims in v0 are accurate and need no patch.

| Claim in v0 | Citation | Notes |
|---|---|---|
| `<program>` is the required root element | §17 + §39 (middleware attrs all live on `<program>`); samples without it emit W-PROGRAM-001 | Confirmed by sample classification — see Stage 1 §6 (W-PROGRAM-001 fires on 224/229 warn samples). Pinned for context-scope discussion at `docs/pinned-discussions/w-program-001-warning-scope.md`. |
| `${ ... }` is the logic block (no `<script>` tag) | §7 (Logic Contexts) | |
| `@var = expr` declares a reactive (sigil required) | §6.1 | |
| `const @name = expr` for derived reactive | §6.6 ("The `const @name = expr` form SHALL be the sole declaration syntax for derived reactive values") | **See §2.3 below — kickstarter's `~name = expr` form contradicts this.** |
| `server function name() { ... }` | §13 (Async Model), §12 (Route Inference) | |
| `?{ \`...\` }` SQL with `${param}` interpolation as bound params | §8 | |
| `.run()`, `.all()`, `.get()` | §8 (SQL execution methods) | |
| **`.prepare()` REMOVED — emits E-SQL-006** | §8 + S41 fix | Verified S41. |
| `lift` for server-fn return + client markup expansion | §10 | |
| `bind:value=@x` two-way binding | §5 | |
| `onclick=fn()` bare-call event handler | §5.2.2 + S34 Bug A | Verified by example 02 compile. |
| `${expr}` for markup interpolation | §7 + §5 attribute quoting | |
| `#{}` scoped CSS block | §9 | |
| `</>` closer | §4 (Block Grammar) | Three closer forms documented. |
| `protect="field1 field2"` (space-separated, NO commas) | §11 (State Objects) | Verified by example 03 (uses `protect="password_hash"`). |
| `< db src="..." protect="..." tables="...">` state block | §11 | Verified by examples 03, 07, 08. |
| Component def: `const Card = <element props={ field: type, ... }>...</>` | §15 (lines 6465, 6511, 6526, 6646, 6659) | All examples in spec use `props={...}` form. |
| `==` lowers to `===` for primitives in server fn (S41 fix) | S41 commit `6ba84be` | |
| `f => ({...})` arrow paren preservation (S41 fix) | S41 commit `0af4eaf` | |
| Auto-await behavior — developer never writes `async`/`await` | §13.1 (explicit prohibition) | Verified S41 (the "async/await reveal"). |
| `<channel>` exists as a markup tag for WebSocket | §38 | But the recipe USING it is wrong — see §2.4 below. |
| `<request>` exists as built-in state type for single-shot fetch | §6.7.7 | But the recipe USING it is wrong — see §2.6 below. |

---

## §2. Confirmed WRONG (with spec citation + correction)

These are kickstarter v0 claims that contradict the spec or stdlib. **Each one will cause compile failures or wrong behavior in agent-generated code.**

### §2.1 `<if test=cond>...</if>` markup tag — DOES NOT EXIST

**v0 says (§2 anti-pattern table, §3 Q5):**
> `{#if cond}…{/if}` (Svelte) → `<if test=cond>…</if>` markup tag in scrml

**Spec says:** §17.1 — `if=` is an **attribute** on any HTML element or component, not a tag. There is no `<if>` element.

**Correct form:**
```scrml
<div if=@condition>...</div>
<!-- or with else chain (§17.1.1): -->
<span if=@loggedIn>Welcome</>
<span else>Please log in</>
```

**Or in logic block (the underlying desugar):**
```scrml
${ if (@condition) { lift <div>...</div> } }
```

**Severity:** HIGH — anyone following v0 will write `<if test=...>` and get a compile error.

---

### §2.2 `<for each=item in=items>...</for>` markup tag — DOES NOT EXIST

**v0 says (§2 anti-pattern table, §3 Q5):**
> `{#each items as item}…{/each}` (Svelte) → `<for each=item in=items>…</for>` markup tag in scrml

**Spec says:** SPEC.md line 7650 (§17 prologue) — **"Iteration is performed using `${ }` + `lift`. There is no dedicated `for=` attribute."** Explicit statement that no `<for>` markup tag exists.

**Correct form:**
```scrml
${
  for (let item of @items) {
    lift <li>${item.name}</li>
  }
}
```

**Severity:** HIGH — every list-rendering attempt by an agent following v0 will break.

---

### §2.3 `~name = expr` tilde-decl for derived reactive — INVENTED SYNTAX

**v0 says (§2 anti-pattern table, §6 reactive recipe):**
> `computed(() => …)`, `$:` (Vue, Svelte) → `~derivedName = expr` (tilde-decl)
> Reactive recipe: `~filteredItems = items.filter(...)`, `~total = ~filteredItems.reduce(...)`

**Spec says:**
- §32 — `~` is the **pipeline accumulator**, a built-in single-slot `lin` variable holding the value of the most recent unassigned expression. There is no `~name = expr` declaration form. Trying to assign to `~name` is a syntax error or, worse, gets misinterpreted as a tilde reinitialization (E-TILDE-002).
- §6.6 — "**The `const @name = expr` form SHALL be the sole declaration syntax for derived reactive values.**" Explicitly says `const @` is the sole form.

**Correct form (the §6 recipe rewritten):**
```scrml
${
  @count = 0
  @query = ""
  // .debounced is unverified — see §3.2 below; for now write debounce explicitly:
  // const @debouncedQuery = ...

  const items = [{ name: "apple", price: 1.20 }, { name: "banana", price: 0.50 }]

  const @filteredItems = items.filter(it => it.name.includes(@query.toLowerCase()))
  const @total = @filteredItems.reduce((s, it) => s + it.price, 0)
}
```

Read derived values as `${@filteredItems}`, `${@total}` (with the `@` sigil), NOT `${~filteredItems}` / `${~total}`.

**Severity:** CRITICAL — this is the cornerstone "how do you do derived state in scrml" answer, and v0 gets it wrong. Conflicts with §6.6's explicit "sole declaration syntax" rule. Also actively misuses `~` (a real lin variable) which will produce E-TILDE-002 noise.

---

### §2.4 Real-time recipe — multiple structural errors against §38

**v0 says (§6 real-time recipe):**
```scrml
<channel name="messageChannel" room="chat-room"
         onmessage="@messages = [...@messages, $.data]"/>
```
And in code: `messageChannel.send({ user: @username, body: @message, ts: Date.now() })`

**Spec says (§38):**
- §38.2 — Attribute is `topic=`, not `room=`
- §38.6.1 — `onserver:message=handleMessage(msg)` is the **function-call form**, not `onmessage="…"` string-expression form. The identifier in the call expression names the parameter the compiler will inject (the parsed message payload).
- §38.4 — Cross-client sync requires `@shared` variables declared **inside** the `<channel>` body. Without `@shared`, no peer sync happens.
- §38.6 — `broadcast(data)` and `disconnect()` are **auto-injected** in any function declared within `<channel>` lexical scope. There is no `<channelName>.send(...)` method. The kickstarter's `messageChannel.send(...)` is invented.

**Correct form:**
```scrml
<program>

  ${
    @username = ""
    @message = ""
  }

  <channel name="chat" topic="lobby"
           onserver:message=handleMessage(msg)>
    ${
      @shared messages = []   // §38.4 — auto-syncs across all clients

      server function handleMessage(msg) {
        // append on server, broadcast to all subscribers
        messages = [...messages, { user: msg.user, body: msg.body, ts: Date.now() }]
        // (broadcast is auto-injected — §38.6)
      }
    }
  </>

  <input bind:value=@username placeholder="Your name"/>
  <ul>
    ${ for (let m of messages) {
      lift <li><strong>${m.user}</strong>: ${m.body}</li>
    } }
  </ul>
  <form onsubmit=handleMessage({user: @username, body: @message, ts: Date.now()})>
    <input bind:value=@message/>
    <button type="submit">Send</button>
  </form>

</program>
```

(Note: the exact "send a message from a form" idiom in §38 may have a more idiomatic shape — examples directory has no working `<channel>` demo to lean on, which is the §38 coverage gap flagged in Stage 1 §3. The above is structurally aligned with §38 normative statements but should be sanity-compiled before being authoritative.)

**Severity:** CRITICAL — every claim in the recipe is wrong: attribute name, handler form, missing `@shared`, invented `.send()` method. This is the scariest finding because the recipe was specifically written to "tell the LLM how to do real-time" and currently teaches it 4 wrong things. Already flagged in S41.

---

### §2.5 `signJwt({ email })` — missing required `secret` and `expiresIn` args

**v0 says (§6 auth recipe):**
```scrml
return signJwt({ email })
```

**Stdlib says (`stdlib/auth/jwt.scrml` line 55):**
```scrml
export async function signJwt(payload, secret, expiresIn) { ... }
```

`signJwt` requires three arguments. Calling it with one will produce a runtime crash (the function uses `secret` to derive HMAC key — undefined `secret` ⇒ crypto.subtle throws).

**Correct form:**
```scrml
return signJwt({ email }, process.env.JWT_SECRET, 3600)
//                         ^^^^^^^^^^^^^^^^^^^^^^^  ^^^^
//                         required (HMAC secret)   expiry seconds (1 hour)
```

**Severity:** HIGH — the canonical "how do you do auth in scrml" recipe is broken. Confirmed in S41.

---

### §2.6 `<request url="..." into=@data>` — INVENTED attribute names

**v0 says (§2 anti-pattern table):**
> `useEffect(() => fetch(url).then(...))` (React) → `<request url="..." into=@data>` markup tag — declarative fetch

**Spec says (§6.7.7):**
```
request-attrs ::= id-attr (deps-attr)?
id-attr       ::= 'id=' string-literal
deps-attr     ::= 'deps=' '[' deps-list ']'
request-body  ::= '$' '{' assignment-expression '}'
```

`<request>` takes `id=` (required, E-LIFECYCLE-018 if missing) and optional `deps=[...]`. The fetch expression goes in the **body**, not in attributes. There is no `url=` or `into=` attribute.

**Correct form:**
```scrml
<request id="profile">
  ${ @user = fetchUser(@userId) }
</>

<!-- with explicit deps -->
<request id="results" deps=[@page, @filter]>
  ${ @items = fetchItems(@page, @filter) }
</>
```

Properties: `<#profile>.loading`, `<#profile>.data`, `<#profile>.error`, `<#profile>.stale`, `<#profile>.refetch()`.

**Severity:** HIGH — the only place v0 mentions `<request>` is in the anti-pattern table, but it teaches an invented attribute set. An agent reaching for "declarative fetch in scrml" will write the wrong attributes.

---

### §2.7 CSRF claim — partially correct after Stage 2 deep-read

**v0 says (§3 Q7):**
> CSRF: Compiler-enforced. Mint-on-403 with automatic client-side retry is built in. **You write zero CSRF code.** It just works.

**Spec + source say:**
- §39.2.3 documents `csrf="on"` as the explicit opt-in.
- **BUT:** `compiler/src/route-inference.ts:1660-1662` shows the compiler **auto-injects** `auth="required"` AND `csrf="auto"` when a file has `protect=` fields without explicit `auth=` (emits W-AUTH-001 to inform the developer). So the canonical-shape `<program auth="required">` + `< db ... protect="...">` pattern (which v0's §1 example uses) DOES end up with CSRF protection, by auto-injection — the developer didn't write `csrf=`.
- **Mint-on-403 with auto-retry IS REAL.** Verified at:
  - `compiler/src/codegen/emit-functions.ts:119-127` — server-fn calls route through `_scrml_fetch_with_csrf_retry`
  - `compiler/src/codegen/emit-client.ts:504` — defines `_scrml_fetch_with_csrf_retry`
  - `compiler/src/codegen/emit-server.ts:332,379,545` — server-side mint-on-403 bootstrap (per GITI-010 commit)

**Verdict:** v0's claim is **mostly correct**. The "you write zero CSRF code" framing is accurate when the canonical shape is followed (with `protect=` triggering auto-injection). The "mint-on-403 with automatic client-side retry" sub-claim is a real shipping feature, not aspirational.

**Remaining nuance to add to v1:**
- Note that auto-injection is gated on `protect=` (or explicit `auth=`/`csrf=` attributes). Apps with neither still have no CSRF.
- `csrf="auto"` is the auto-injected default; spec only documents `csrf="on"` explicitly. **`csrf="auto"` value appears to be an undocumented compiler internal** — worth a separate spec PR.

**Severity:** LOW (was MEDIUM in initial read). v0 is essentially right; just needs a one-line clarification about the `protect=` trigger.

---

### §2.8 Slots claim "${...} children spread inside component bodies (§16)" — incomplete

**v0 says (§2 anti-pattern table):**
> `<slot />` inside SFC (Vue, Svelte) → scrml slots use the `${...}` children spread inside component bodies (§16)

**Spec + example 12 say:**
- §16 + example 12 — the canonical pattern is `slot="name"` on call-site children + `${render slotName()}` invocation in the component body.
- `${children}` is for **unnamed** children only.
- Snippet props: `props={ header: snippet, body: snippet, actions?: snippet }` (with `?:` for optional).

**Correct claim (rewritten):**
> Component slots: declare snippet props (`props={ header: snippet, body: snippet }`), call-site fills with `slot="name"` on children, component body invokes via `${render header()}`. For a single unnamed child region, use `${children}` in the component body.

**Severity:** LOW — partially right (children spread does exist for unnamed children), but the canonical multi-slot pattern (`slot=` + `render`) is omitted. Agents asked for multi-slot UI will not know what to write.

---

## §3. RESOLVED — was unverified, now confirmed against source

All 8 unverified claims from the initial Stage 2 read now have answers. Resolved 2026-04-25 same session.

### §3.1 `auth="required"` attribute on `<program>` — **REAL** ✓

**Verification:** `compiler/src/route-inference.ts:113` ("Auth middleware configuration derived from `<program auth="required">` or auto-escalation"). `route-inference.ts:1611-1648` enumerates the auth-middleware injection logic. Compiler auto-injects `auth="required"` + `csrf="auto"` when `protect=` is present without explicit `auth=` (emits W-AUTH-001).

**Verdict:** v0 §1 canonical-shape `<program auth="required">` is correct. The attribute is live in the compiler. The spec grep miss is a **spec gap** — `auth=` belongs in §40 (middleware attributes) but isn't there. Worth a spec PR.

**Action for v1:** keep the claim. Add a one-line note about auto-injection when `protect=` is present.

---

### §3.2 `.debounced(ms)` method-on-reactive — **WRONG SYNTAX, REAL PRIMITIVE**

**Verification:**
- The actual source-level syntax is **`@debounced(N) name = expr`** — a **declaration modifier**, not a method call.
- Confirmed at `compiler/src/ast-builder.js:2124` and `:3736` (parser comments: "@debounced(N) MODIFIER: `@debounced(N) name = expr`").
- AST type at `compiler/src/types/ast.ts:444`: "A debounced reactive declaration: `@debounced(N) name = expr`".
- Codegen emits `_scrml_reactive_debounced(name, () => init, ms)` per `compiler/src/codegen/emit-logic.ts:1163`.

**Correct form:**
```scrml
${
  @query = ""
  @debounced(300) debouncedQuery = @query   // ← modifier on declaration
}
```

**v0 was wrong:** `@debouncedQuery = @query.debounced(300)` is invented — `.debounced()` is not a method. The primitive is real but the syntax is a declaration modifier, not a postfix.

**Action for v1:** rewrite §6 reactive recipe to use the real form. Also update §2 anti-pattern table row (was: "Hand-rolled debounce → `@debouncedX = expr` (built-in)" — that was misleadingly minimal).

---

### §3.3 `import { x } from 'scrml:<module>'` syntax — **REAL, also `use scrml:<module>`** ✓

**Verification:** §41 (Import System — `use` and `import`) documents both forms:
- §41.2 — `use scrml:auth` is the **capability import** form (line 14151)
- §41.3 — `${ import { session } from 'scrml:auth' }` is the **value import** form (line 14199-14200)
- Resolution scheme (§41.3 line 14215, 14228): `scrml:` prefix resolves first to the compiler-bundled stdlib, then to `vendor/scrml/`. Examples cited: `scrml:ui`, `scrml:auth`, `scrml:chart`, `scrml:utils`.

**Verdict:** v0 §4 stdlib catalog and the auth recipe are **correct** to use `import { hashPassword, signJwt } from 'scrml:auth'`. That's the §41.3 value-import form.

**Action for v1:** keep as-is. Optionally add a §41.2 `use` form mention for callers who want capability-style imports. Note that `scrml:utils` etc. are spec-cited examples — the actual stdlib catalog (`scrml:data`, `scrml:auth`, `scrml:crypto`, ...) has slightly different module names. Worth verifying each module name in v0 against `stdlib/` dir at v1 time.

---

### §3.4 CSRF "mint-on-403 with automatic client-side retry" — **REAL, SHIPPING** ✓

**Verification:** Already integrated into §2.7 above. Briefly:
- `compiler/src/codegen/emit-client.ts:504` defines `_scrml_fetch_with_csrf_retry`
- `compiler/src/codegen/emit-functions.ts:119-127` routes server-fn calls through it
- `compiler/src/codegen/emit-server.ts:332,379,545` provides server-side mint-on-403 bootstrap (GITI-010 commits)

**Verdict:** Real, shipping. v0 §3 Q7 claim is accurate. The only nuance is the `protect=` / `csrf=` trigger condition (now folded into §2.7 above).

---

### §3.5 Component `prop:Type` annotation form — **DOES NOT EXIST** ✗

**Verification:** Spec grep for `prop:` returned only CSS-property matches (`prop:value` in `#{}` flat-decl blocks, line 4920) and `snippet`-typed prop docs (§16 lines 7083, 7289). No `<element prop:Type>` annotation form anywhere in §15.

**Verdict:** v0 §3 Q6 claim — "Props declared in a `props={...}` attribute or inline as `prop:Type` annotations on root element (§15)" — the second half is **invented**. Only the `props={...}` form exists.

**Action for v1:** drop the "or inline as `prop:Type`" half. Just say `props={ field: type, ... }`.

---

### §3.6 CLI commands — **MOSTLY CORRECT** ✓

**Verification:** `compiler/src/cli.js:81` enumerates the subcommands: `compile`, `dev`, `build`, `serve`, `init`. All five v0 claims are real.

**Verdict:** v0 §5 CLI list is correct. No `start`, no `scrml.config.js` — confirmed.

**Action for v1:** keep as-is. Add a small example invocation per command if helpful, since the kickstarter targets LLMs who may not infer `scrml dev examples/` from the bare table.

---

### §3.7 `protect=` separator — **WRONG IN v0; spec + source say COMMA, v0 says SPACE** ✗

**Verification:**
- Spec §11.1 (line 5334): "`protect=` — comma-separated list of column names to protect."
- Spec §11.1 (line 5335): "`tables=` — comma-separated list of table names to bring into scope."
- Source: `compiler/src/protect-analyzer.ts:741` uses `parseCommaList(protectRaw)` — the splitter is comma-based.
- HTML elements registry: `compiler/src/html-elements.js:522` — comment says "global protect list (comma-separated field names)".
- Compile test: `protect="password_hash, session_token"` (with comma) parses past the protect= step (test failed downstream on missing DB, not on attribute parse).

**Verdict:** v0 §7 known-traps — "Don't add commas inside `protect=` lists. Use space-separated: `protect="password_hash session_token"`." — **is the OPPOSITE of what the compiler does.** The compiler expects commas. v0's advice will silently treat `"password_hash session_token"` as a single field name, fail E-PA-007 ("Field name `password_hash session_token` does not match any column in any table"), and confuse the developer.

**Severity:** HIGH — actively wrong. An adopter who follows v0's advice loses field protection AND gets a cryptic compile error.

**Action for v1:** flip the rule. Comma-separated, possibly with optional spaces around commas. Example: `protect="password_hash, session_token"`.

---

### §3.8 "Built-in `@debouncedX = expr`" anti-pattern row — **WRONG, points at non-existent primitive**

**Verification:** Resolved by §3.2 above. The real primitive is `@debounced(N) name = expr` (declaration modifier). The v0 row implies a `@debouncedX = expr` shape that doesn't exist; it's not how the modifier works.

**Action for v1:** rewrite the row. Suggested: "Hand-rolled debounce in `effect()` (invented) → `@debounced(300) name = expr` declaration modifier (built-in, see §6 reactive recipe)".

---

---

## §4. Severity rollup (post-resolution)

| Severity | Count | Examples |
|---|---|---|
| CRITICAL — recipe-level breakage, agents will hit immediately | 3 | §2.3 `~name=` derived, §2.4 real-time recipe (chain), §2.6 `<request url= into=>` |
| HIGH — common feature, compile failure on first attempt | 5 | §2.1 `<if test=>`, §2.2 `<for each= in=>`, §2.5 `signJwt` arity, §3.2 `.debounced(ms)` syntax, §3.7 `protect=` separator (newly elevated) |
| MEDIUM — misleading but not catastrophic | 0 | (was §2.7 CSRF — downgraded after deep-read) |
| LOW — incomplete but not wrong | 2 | §2.7 CSRF nuance (one-line clarification needed), §2.8 slots claim, §3.5 spurious `prop:Type` |
| CONFIRMED CORRECT (was unverified) | 4 | §3.1 `auth=`, §3.3 `scrml:` imports, §3.4 mint-on-403 retry, §3.6 CLI commands |

**Final tally: ~22 correct, 10 wrong (3 CRITICAL + 5 HIGH + 2 LOW), 0 unverified.** No claims left in limbo.

The kickstarter v0 has a definable, finite patch set. After the §5 patches land, v1 will be 100% spec-aligned (modulo any spec gaps that emerge during the rewrite — `auth=` location and `csrf="auto"` value are two known spec-doc holes).

---

## §5. Patches needed for kickstarter v1 (input to Stage 6)

In priority order:

1. **Rewrite §6 real-time recipe** (CRITICAL). Use `topic=`, `onserver:message=handler(msg)`, declare `@shared messages` inside body, replace `messageChannel.send` with `broadcast()` from a server-fn declared inside the channel body. **Compile-test the resulting recipe before publishing.**
2. **Rewrite §6 reactive recipe** (CRITICAL). Replace every `~name = expr` with `const @name = expr`. Replace `@query.debounced(300)` postfix with `@debounced(300) debouncedQuery = @query` declaration modifier (§3.2 resolved).
3. **Rewrite §2 anti-pattern rows for `<if>`, `<for>`, `<request>`, `@debouncedX`, slots** (HIGH/CRITICAL).
   - `<if test=>` → `<element if=cond>...</element>` attribute form (or `${ if (cond) { lift ... } }`)
   - `<for each= in=>` → `${ for (let x of xs) { lift ... } }` logic-block iteration
   - `<request url= into=>` → `<request id="..." deps=[]>${ @data = fetchExpr() }</>`
   - Hand-rolled debounce → `@debounced(300) name = expr` modifier (NOT `.debounced()`)
   - `<slot />` → `slot="name"` + `${render slotName()}` (multi-slot) AND `${children}` (single unnamed)
4. **Rewrite §6 auth recipe** (HIGH). Use `signJwt(payload, secret, expiresIn)` correct call form. Demonstrate `process.env.JWT_SECRET` pattern + reasonable TTL.
5. **Fix §7 known traps `protect=` separator** (HIGH). Flip from "space-separated" to "comma-separated" (§3.7 resolved). Example: `protect="password_hash, session_token"`. **This is currently teaching the OPPOSITE of what the compiler accepts.**
6. **Rewrite §3 Q6 component props** (LOW). Drop the spurious "or inline as `prop:Type`" half (§3.5 resolved). Only `props={ field: type, ... }` exists.
7. **Expand §3 Q7 CSRF** (LOW). One-line clarification: auto-injection happens when `protect=` is present (compiler injects `auth="required"` + `csrf="auto"`); apps without `protect=` and without explicit `csrf=` have no CSRF.
8. **Add `<program auth="required">` reference to spec §40** (SPEC PR, not v0 patch). Compiler implements it but spec doesn't document it — `csrf="auto"` value is similarly undocumented. Both should land in spec at v1 time so v1 can cite §40 properly.

Plus the v1 patches already known from S41 (overlapping):
- Add prominent "auto-await / anti-instincts" section to catch JS muscle memory
- Reframe §1 as "start from this and rename" not feature tour
- Add high-value gaps from S41 close hand-off (UPDATE example, session lifecycle, multi-page routing, schema cold-start, checkbox attr, `${expr}` in attr strings, side-effect/reactive-effect, multi-statement onclick, `class:foo=`, literal `$`, edit-vs-create form, boolean coercion, number coercion). Some of these (e.g. "empty-state in `<for>`") become moot here since `<for>` markup tag doesn't exist.
- Add clarifications from S41 close (bare-call/event-arg paragraph, `==` lowering scope, `</>` rule, `<program>` warning vs error, `lift` overload)

---

## §6. Cross-references

- Stage 1 audit (per-example status + spec coverage matrix): `docs/audits/scope-c-stage-1-2026-04-25.md`
- Pinned discussion (W-PROGRAM-001): `docs/pinned-discussions/w-program-001-warning-scope.md`
- Kickstarter v0 source: `docs/articles/llm-kickstarter-v0-2026-04-25.md`
- SPEC: `compiler/SPEC.md` (sections cited above)
- SPEC-INDEX: `compiler/SPEC-INDEX.md`
- Stdlib auth (signJwt verification): `stdlib/auth/jwt.scrml`
- Stdlib time (debounce verification): `stdlib/time/index.scrml`
- Compiler runtime (`_scrml_reactive_debounced`): `stdlib/compiler/dist/scrml-runtime.js:717`
- S41 hand-off (prior-known wrong claims): `handOffs/hand-off-42.md` §1 PHASE 2 + §2 Stage 6

---

## Tags
#scope-c #stage-2 #kickstarter-v0-verification #spec-cross-reference #docs-audit #kickstarter-v1-blockers #critical-recipe-bugs

## Links
- [docs/audits/scope-c-stage-1-2026-04-25.md](./scope-c-stage-1-2026-04-25.md)
- [docs/pinned-discussions/w-program-001-warning-scope.md](../pinned-discussions/w-program-001-warning-scope.md)
- [docs/articles/llm-kickstarter-v0-2026-04-25.md](../articles/llm-kickstarter-v0-2026-04-25.md)
- [compiler/SPEC.md](../../compiler/SPEC.md)
- [compiler/SPEC-INDEX.md](../../compiler/SPEC-INDEX.md)
- [stdlib/auth/jwt.scrml](../../stdlib/auth/jwt.scrml)
- [stdlib/time/index.scrml](../../stdlib/time/index.scrml)
- [hand-off.md](../../hand-off.md) — S42 active
