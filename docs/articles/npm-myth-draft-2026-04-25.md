I am a truck driver by trade. I program because I love solving puzzles. So I have always been much more the "roll your own" type, I mean, why should I let someone else have all the fun.

Every time I ever had to actually inovolve Node into anything I was working on, I cringed, and would try desperately not to have to fall down that rabbit hole. Because, axiomatically, the only way out is through.

But no matter how much I dreaded typing node; What truly got my blood boiling was what I always have, and always will, consider the worlds most cancerous leaky abstraction, NPM.

# What npm package do you actually need in scrml?

**Draft — 2026-04-25.**

So when people tell me scrml's "weakness" is that it doesn't have an easy npm-install path yet, I have to laugh. That isn't a weakness. That's the *whole point*. I built scrml in part because I was sick of pulling in 200 packages to do what one well-designed language should do natively.

Now to be fair — there *is* a real version of this critique, and I'm going to address it head-on. A `scrml vendor add <url>` CLI is on the roadmap. Until it ships, ingestion of arbitrary client-side bundles is rougher than it should be. Fine. I'll concede that.

But the *invalid* version of the critique — and the one I keep hearing — is the implication that there's some long, essential list of npm packages a scrml app would want and can't have. So let's actually enumerate them. Because when you do, the list is comically short.

Here's the punchline up front: **the npm-interop critique is mostly cargo-culted muscle memory from the React/Node era.** Modern Bun + scrml's stdlib + scrml's language features collapse the whole package list down to about five categories, and only one of those — heavyweight client-side widgets like CodeMirror, three.js, and Leaflet — is a real story problem worth solving with vendor ingestion. The rest is a rounding error.

## What npm typically supplies, and where each goes in a scrml app

### Replaced by the language itself

These categories account for most of a typical Node project's `package.json`. None of them have a place in a scrml app, because scrml *is* this layer.

- **Framework + state + routing + forms** — React, Vue, Svelte, Redux, Zustand, Pinia, react-router, vue-router, Formik, react-hook-form. scrml's reactive primitives (`@var`, derived, effects), components, file-based routing, and bindings replace the entire stack.
- **ORM / query builder** — Prisma, Drizzle, Kysely, TypeORM, Sequelize. scrml's `?{}` SQL block writes parameterized queries directly against Bun.SQL, with compile-time schema introspection and protected-field enforcement (§44, §39, §11).
- **CSS-in-JS / scoping** — styled-components, emotion, vanilla-extract. scrml's `#{}` scoped CSS uses native `@scope` (§9.1, §25.6).
- **HTTP client** — axios, got, ky. Server fns can call `fetch` directly. Markup-side fetches use `<request>` and `lift`.
- **Build / bundle / dev server** — Vite, Webpack, esbuild, Parcel. `scrml dev`, `scrml build`, `scrml serve`. Done.
- **Test runner** — vitest, jest, mocha. `bun test`, plus the `scrml:test` stdlib for assertions.
- **WebSocket plumbing** — socket.io, ws. scrml's `<channel>` (§38).
- **Auth / CSRF middleware** — passport, csurf, express-session. Boundary security is enforced by the compiler. CSRF mint-on-403 is built in.
- **Validation (the zod case)** — zod, yup, joi, ajv, superstruct. I have two answers here, and both of them are stronger than zod:
  1. **§53 inline type predicates** are compile-time-enforced refinement types: `let x: number(>0 && <10000)`, `fn process(amount: number(>0 && <10000))`, `type Invoice:struct = { amount: number(>0 && <10000) }`. Named shapes like `email`, `url`, `uuid` are first-class. Violations are compile errors (E-CONTRACT-001), not runtime exceptions you find out about when production blows up. **Zod can't fail your build. This can.**
  2. **`scrml:data/validate`** stdlib for runtime form validation when the data shape is genuinely unknown until runtime: `validate(data, schema)` returns `{ field: errors[] }`, with rule builders for `required`, `email`, `minLength`, `maxLength`, `pattern`, `min`/`max`, `numeric`, `integer`, `matches`, `oneOf`, `url`, plus domain composites (`emailField`, `passwordField`, `passwordConfirmField`).

If you've ever installed all of the above into a single React app, you've installed roughly 60-80% of the average `package.json` line count. None of it belongs in a scrml app. Ever.

### Replaced by Bun

Bun is the runtime, and Bun's stdlib has steadily absorbed the rest of the lower-level Node ecosystem. Every one of these used to be an npm package; now they're built in:

- `bcrypt` → `Bun.password`
- `jsonwebtoken` / `jose` → web crypto + `Bun.password`
- `pg`, `mysql2`, `better-sqlite3` → `Bun.SQL`
- `ioredis`, `redis` → `Bun.redis`
- `sharp` (some cases) → `Bun.spawn` to imagemagick, or vendor when you really need to
- `nodemailer` → `Bun.spawn` to system MTA, or REST-call a transactional email API
- `dotenv` → built into Bun
- `fs-extra` → Bun's `fs` ergonomics

This is what I mean when I say "roll your own": Bun's authors did. Now nobody has to npm-install bcrypt and pray the maintainer doesn't get bored.

### Already in scrml's stdlib

The 13-module stdlib already covers most of the "I'd npm install a small utility" reflex. I built it intentionally small but not so small that you have to leave the language for the basics:

| stdlib module | replaces |
|---|---|
| `data/validate` (+ §53) | zod, yup, joi |
| `data/transform` | lodash (`pick`, `omit`, `groupBy`, `sortBy`, `unique`, `flatten`, ...) |
| `auth` | bcrypt, jsonwebtoken, speakeasy (TOTP), express-rate-limit |
| `crypto` | crypto-js, bcryptjs, hashing helpers |
| `http` | axios, got, node-fetch (typed wrapper with timeout + retry) |
| `time` | date-fns / dayjs (basic format), lodash.debounce/throttle |
| `format` | slugify, change-case, pluralize, currency/number formatting |
| `store` | KV store, session store, counter (replaces `connect-sqlite3` and basic redis use) |
| `router` | path-to-regexp, qs |
| `test` | chai, parts of jest/expect |
| `fs`, `path`, `process` | Node compat layer |

The stdlib isn't trying to be everything. It covers the high-frequency reaches; specialty libraries get vendored. That's the deal.

### Trivially vendored or rewritten

Things that are honestly small enough to copy straight into your project:

- `uuid`, `nanoid` — one-liners against `crypto.randomUUID()` or web crypto. Why are these npm packages?
- More date math beyond the stdlib — vendor a single function from `date-fns`. Don't drag in the whole library.
- Markdown rendering for short content — `marked` is small and CDN-vendorable.
- Most of the `@types/*` ecosystem — irrelevant, scrml has its own type system.

If your "I need this from npm" instinct fires for one of these, the cost-benefit of vendoring a 40-line helper vs. wiring up a package manager flow isn't even close. Just write the function. Have the fun.

### Service SDKs are mostly thin REST wrappers

This is the category most often invoked as a counterexample, and it's the one that drives me up a wall, because it's mostly a misconception:

- **Stripe, OpenAI, Anthropic, Resend, SendGrid, Twilio, Slack, GitHub** — these are REST APIs. Their official SDKs are typed wrappers around `fetch`. Calling the REST endpoint directly from a server fn is a 10-line `fetch` call. Yes, the SDK convenience is real (typed responses, retry logic, pagination helpers). No, it isn't load-bearing.
- **AWS SDK** — somewhat heavier (SigV4 request signing), but you can either vendor the v3 modular packages or write a small SigV4 helper. People sign requests in 30 lines of bash; you can do it in scrml.

A scrml convention of "here's the canonical pattern for hitting Stripe / OpenAI / AWS from a server fn" docs page closes most of this gap. The capability already exists. The recipe doesn't, yet. That's a docs problem, not a language problem.

### Where npm interop actually bites

Here's the honest list. The places where I'll grant you the criticism has teeth. These are heavyweight client-side libraries that you cannot reasonably re-implement, no matter how much I love rolling my own:

- **Code editors** — CodeMirror 6, Monaco, ProseMirror, TipTap, Lexical. 100k+ LOC each. (6nz already vendors CM6 via dynamic import + a `__cmMod` global bridge — it's a working pattern.)
- **3D** — three.js, babylon.js
- **Maps** — Leaflet, mapbox-gl, MapLibre
- **Charts beyond stdlib** — Chart.js, ECharts, D3, Plotly, Highcharts (scrml has `chart-utils.js` for the lighter end)
- **PDF generation** — pdf-lib, jspdf
- **Animation beyond CSS** — Framer Motion, GSAP, anime.js
- **Real-time collab CRDTs** — Yjs, Automerge
- **Rich graph viz** — dagre, vis-network, cytoscape

Every one of these is the same pattern: a heavyweight bundle that needs to load on the client, get a JS handle, and be called from app code. **One mechanism solves the whole class:** `scrml vendor add <url>` ingests a UMD or ES bundle from a CDN, generates a type shim, and wires it into the boundary security model. The 6nz CM6 integration is a working proof-of-concept already.

That's the entire honest list. About ten categories of widget. Not "an open-ended ecosystem of two million packages."

## So what's the strategic gap?

The critique stops landing once three things ship:

1. **`scrml vendor add <url>` CLI** — flat-file ingestion of a CDN bundle, type-shim generation, manifest tracking. Already on the roadmap.
2. **A type-shim story for vendored bundles** — the moment an adopter does `vendor add chart.js`, they hit "untyped global." A canonical pattern (declare-only `.d.scrml` or equivalent) closes this.
3. **A "calling external REST SDKs" recipes doc** — five examples (Stripe, OpenAI, AWS S3, Resend, Slack webhook) showing the `fetch`-from-server-fn pattern with auth headers and typed responses.

Build those three things and the npm critique loses about 90% of its bite. The remaining 10% is the heavy widget category, and the answer there is "vendor the bundle; we will never npm-install three.js, and that's fine."

## The deeper point

The npm ecosystem is enormous *because* the JavaScript language and the browser platform are minimal. Most of those packages exist to paper over missing primitives — a state library to give you reactivity, a router to give you routing, a CSS-in-JS library to give you scoped styles, an ORM to give you queries, a validation library to give you types at the boundary. When the language and runtime supply those primitives natively, the package list collapses.

That's the bet I'm making with scrml. An opinionated language with a real type system, a real reactive model, real boundary security, real query syntax, and a small focused stdlib is a smaller surface to learn and a smaller surface to maintain than a Node project that wires together 200 packages to recreate the same capabilities. The npm-interop critique reads as a weakness only if you assume the package list is a fixed cost. It isn't. **It's the symptom.**

The one package you actually need is `vendor add chart.js`. Build that well and the conversation is over.

And me? I'll be back in the cab, thinking about the next puzzle.

---

## Notes for revision

- Tone: aimed at adopters and critics who already understand the JS ecosystem. Not aimed at total newcomers.
- Length: ~1,650 words with the personal voice. Could be tightened to ~1,200 by collapsing the table + dropping the "deeper point" section, but the voice is what makes it read like a person and not a position paper.
- Tag-mode: published as "Article" / "Position piece" rather than "Documentation."
- Things deliberately not claimed: that scrml is faster, that scrml is easier to learn, that scrml is production-ready for everyone. The argument is purely "the npm-package list you'd actually need is short."
- Things to verify before publication: that `scrml vendor add` is still on the roadmap and not silently retired; that the stdlib module list is still accurate (drift risk); that the §53 named shapes list (`email`, `url`, `uuid`, `phone`) actually ships in the current compiler vs. just spec.
- Possible companion piece: "What `scrml vendor add` will and won't do" — once that CLI ships.
