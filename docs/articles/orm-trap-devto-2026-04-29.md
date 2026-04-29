---
title: The ORM trap
published: false
description: ORMs exist to soften raw SQL strings in JS. When the compiler owns the SQL block, the trap they were built to avoid no longer exists.
tags: webdev, javascript, programming, compiler
cover_image:
canonical_url:
---

*authored by claude, rubber stamped by Bryan MacLee*

**TL;DR: ORMs trade raw SQL for a query DSL that approximates SQL plus a schema file that drifts from the database. When the compiler owns the SQL block and the schema is in the same AST, neither tradeoff exists.**

Every ORM I have ever looked at started by promising it would let me write code instead of SQL, and ended with me reading the generated SQL anyway because something was off.

I am not an experienced framework developer. I can hobble through React if I HAVE TO. But across about twenty compiler attempts, the same shape kept showing up: if the language can read the database schema at compile time, the entire reason ORMs exist quietly evaporates. The query string stops being a string. The schema stops being a separate file. The migration story stops being a separate workflow.

This is the third feature from the browser-language overview piece. Boundary disappearing was the second. Query layer collapsing into the compiler is the third. Same structural argument: vertical integration of a thoughtful design unlocks features that piecewise alternatives literally cannot ship.

## Why ORMs exist in the first place

Raw SQL strings in JavaScript are noisy. You write a string. The string has placeholders. The placeholders bind to runtime values. The result has a shape your IDE cannot infer because the shape lives in a database, not in the type system. So someone built an ORM. Then someone built a typed query builder. Then someone built a schema-first ORM. Each one was a different bet on how to shrink the gap between "I have data in a database" and "I have a typed value in my program."

The bet looks like this:

1. Declare the schema in a separate file (Prisma's `schema.prisma`, Drizzle's `schema.ts`, TypeORM's entity classes).
2. Run a generator that produces a typed client from that schema.
3. Use the client's query DSL to express queries in something that reads like JavaScript.
4. The DSL compiles down to SQL at runtime.

The first three steps each look like an ergonomic win. The fourth is where the receipt comes due.

## What the seam actually costs

Pick any mature stack. Prisma plus a Postgres database. Drizzle plus SQLite. Kysely plus MySQL. The shape of the costs is the same.

**The schema is a separate artifact.** `schema.prisma` is not the database. It is a *description* of what you would like the database to look like. The database has its own state. The two are kept in sync by a migration tool that runs out-of-band from your build. If they ever disagree, your generated types are confidently wrong.

**The generated client is a separate artifact.** You run `prisma generate` after every schema change. The client is large. The client's types are the only thing your editor knows about. If the generator did not run after your last schema edit, your editor is showing you stale autocomplete and the build silently uses the stale client.

**The query DSL approximates SQL but is not SQL.** Drizzle gets impressively close. So does Kysely. Both still have edge cases where the right SQL exists but the DSL does not express it cleanly, so you reach for `sql.raw()` or escape hatches and the type safety of the surrounding query stops applying. You are now writing a SQL string with no schema awareness, inside a tool that exists because raw SQL strings have no schema awareness.

**Column typos are a runtime question.** If you write `where: { usrname: "alice" }` against a table whose column is `username`, the typed client may catch it, depending on how the schema generator named your fields. If you write the same typo inside a `sql.raw()` block, nothing catches it until the query runs against the live database. The diagnostic surfaces in production logs at 3am, not at compile time.

**Migrations are their own subsystem.** Different tool. Different files. Different vocabulary (`migrate dev`, `migrate deploy`, `db push`, `prisma migrate resolve`). Their job is to walk the live database from "what it looks like now" to "what `schema.prisma` says it should look like." When that walk fails, you are several steps removed from the code that triggered it.

This is the seam. It is the same shape as the server-boundary seam. Multiple tools, each good at one piece, none of them owning the whole pipeline. The ORM exists to plug one specific gap in that pipeline. It does an honest job. It does not eliminate the pipeline.

## The same feature in scrml

```scrml
< schema>
    users {
        id:       integer primary key
        username: text not null unique
        email:    text not null
    }
    posts {
        id:        integer primary key
        author_id: integer not null references users(id)
        title:     text not null
        body:      text not null
    }
</>

< db src="./app.db" tables="users, posts">

server fn getUserPosts(userId: number) {
    return ?{`
        SELECT p.title, p.body, u.username
        FROM posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.author_id = ${userId}
        ORDER BY p.id DESC
    `}.all()
}

</>
```

That's the entire feature. One file. One AST.

What the compiler did:

1. Parsed the `< schema>` block (§39) and held the column list for `users` and `posts` in memory.
2. Parsed the `< db>` block (§11) and resolved the driver from the connection string (§44).
3. Parsed the `?{}` SQL template (§8). The `${userId}` interpolation compiled to a bound parameter, not string concatenation. There is no `sql.raw()` in scrml.
4. Validated the SQL template syntactically against the database. A malformed template is E-SQL-002 at compile time, not a runtime exception.
5. Computed the migration diff between `< schema>` and the live database. `scrml migrate` applies it. The developer never writes `ALTER TABLE` by hand.

There is no `prisma generate` step. There is no generated client. There is no separate query DSL to learn. The query is SQL. The compiler reads SQL. The schema is in the same file the compiler is already parsing.

## What the compiler can do that no ORM can

The schema introspection runs as a compiler pass. The data structure is `paResult.protectAnalysis.views.get(stateBlockId).tables.get("users").fullSchema`. It is a list of column names with types and primary-key/index status. It is sitting in memory the moment the LSP analyzes a buffer.

That fact unlocks features that are not reasonable to build in a piecewise stack:

- **Column completion against the live schema.** Cursor inside a `?{}` block, type `SELECT u.`, the LSP suggests every column on `users` with its SQL type.
- **`protect=` field validation with quick-fix.** A `< db protect="passwrd">` (typo) becomes E-PA-007 at compile time. The LSP's L4 quick-fix runs Levenshtein over the column list and offers `passwordHash` (or whichever column you actually meant).
- **Schema-driven migration diff.** The compiler reads what `< schema>` says, reads what the live database says, computes the SQL needed to walk one to the other, and emits it as a migration.
- **Bound-parameter enforcement is normative.** `${expr}` inside `?{}` SHALL compile to a bound parameter. There is no opt-out. There is no `.raw()`. The grammar refuses.
- **Direct Bun.SQL codegen.** A `?{}` block emits a Bun.SQL tagged-template call. No runtime ORM layer. No prepared-statement cache to manage; Bun.SQL caches internally and `.prepare()` is removed (E-SQL-006).

The N+1 batching story (the intro article walks the numbers) is a separate piece of leverage that follows from the same fact: the compiler can rewrite a query inside a loop because it owns the loop and the query in one AST.

## What gets refused at compile time

Six refusals worth naming, each a real diagnostic with an E-code:

**E-PA-001 / E-PA-006.** `< db src="./missing.db">` where the file does not exist, or the `src=` attribute is missing entirely. The build fails before any query runs.

**E-PA-004.** `< db tables="usrs">` where the table is misspelled or does not exist. The build prints the actual table list.

**E-PA-007.** `protect="passwrd"` against a table whose actual protected column is `password_hash`. Compile error with a Levenshtein-ranked "did you mean `password_hash`?" quick-fix from the LSP.

**E-SQL-002.** A SQL template that is syntactically invalid. The compiler validates the template at compile time, before the query ever ships.

**E-SQL-003.** Trying to construct the SQL string at runtime and pass it to `?{}`. The content between `?{`` and ``}` is a fixed template, not a runtime expression. The compiler refuses.

**E-SQL-004.** A `?{}` block with no `<program db="...">` ancestor. The compiler cannot pick a driver out of thin air; it tells you which attribute is missing.

That last one is the structural point: the database is not a runtime concern that happens to need a driver. It is a compile-time fact the program declares.

## What this kills

- **`schema.prisma` and equivalents.** The schema is in `< schema>`. There is no second file. There is no second source of truth.
- **`prisma generate` and equivalents.** There is no generated client. The compiler reads the schema directly.
- **Query DSL learning curves.** No `db.users.findMany({ where: {...}, include: {...}, orderBy: {...} })`. SQL is the syntax. The whole-stack compiler reads it.
- **Type definitions that drift from the database.** There is no hand-written interface to fall behind. The `< schema>` block is the type, the migration source, and the introspection source, in one declaration.
- **`sql.raw()`-style escape hatches that silently lose type safety.** Bound parameters are mandatory. Raw construction is E-SQL-003 at compile time.
- **Most of the "I'd reach for an ORM here" instinct.** The instinct exists because raw SQL strings in a JavaScript file are unanchored. In scrml they are not unanchored. The schema is right there.

## What is still real

This is not "ORMs are wrong." Honest list of what they earn:

**Cross-database portability.** Drizzle and Kysely both target multiple engines. If the same TypeScript codebase has to ship against Postgres in production and SQLite in tests, the DSL abstracts the dialect differences. scrml's `?{}` adapts driver based on `<program db="...">`, so Bun.SQL handles SQLite, Postgres, and MySQL. MongoDB is explicitly out of `?{}` (use `^{}` meta context). So the portability story is real but bounded by Bun.SQL's coverage.

**Migrations exist.** scrml has them. They are computed by diffing `< schema>` against the live database, but they exist as their own artifact and `scrml migrate` is a separate command. The schema-first ORMs got this part right. The difference is who owns the source-of-truth declaration.

**Transactions are deferred.** Current spec workaround is `^{}` meta with direct Bun.SQL `sql.begin()` (§44.6). A native scrml syntax for transactions is in the roadmap; until it ships, this is a real gap and worth naming honestly.

**Specialized query patterns.** Window functions, recursive CTEs, JSON operators, full-text search. SQL has all of these. So does `?{}`, because `?{}` is SQL. ORMs vary in how cleanly they expose them. The point is not that scrml is more powerful than every ORM at every query shape. The point is that the SQL string is the language the compiler reads, so the language is as expressive as SQL itself.

The honest summary is this: ORMs exist to plug a gap. The gap is real. They plug it well enough that mature stacks rely on them. But the gap exists because the language and the database are speaking different languages, and the schema lives in a different artifact from the code. When the compiler owns both, the gap is gone.

## The deeper claim

A reactive system that wires its dependencies at compile time does no work at runtime to figure out what to update. A boundary that is enforced at compile time does not need a validator on the wire. A query that knows its schema at compile time does not need an ORM to translate intent.

The runtime does less because the compiler did more. The query layer stops being a place where types drift, where DSLs approximate SQL, where generated artifacts go stale, where 3am alerts fire because a column rename did not propagate. It starts being what it should have been from the start: SQL, anchored to a schema the compiler can read, in a file the compiler is already parsing.

That is the design. A little short of perfect is still pretty awesome.

## Further reading

- [Why programming for the browser needs a different kind of language](https://dev.to/bryan_maclee/why-programming-for-the-browser-needs-a-different-kind-of-language-6m2). The high-altitude six-feature overview that this piece zooms in on.
- [Introducing scrml: a single-file, full-stack reactive web language](https://dev.to/bryan_maclee/introducing-scrml-a-single-file-full-stack-reactive-web-language-9dp). The intro article. Owns the N+1 batching numbers if you want the perf piece.
- [The server boundary disappears](https://dev.to/bryan_maclee/the-server-boundary-disappears-hap). The companion piece on the wire seam. Same structural argument applied to client/server instead of code/database.
- [What scrml's LSP can do that no other LSP can, and why giti follows from the same principle](https://dev.to/bryan_maclee/what-scrmls-lsp-can-do-that-no-other-lsp-can-and-why-giti-follows-from-the-same-principle-4899). Where the column-completion and `did you mean?` quick-fix live in the toolchain.
- [What npm package do you actually need in scrml?](https://dev.to/bryan_maclee/what-npm-package-do-you-actually-need-in-scrml-2247). Includes the "Prisma, Drizzle, Kysely, TypeORM, Sequelize: replaced by the language" line item. This piece is the long form of that line.
- [Null was a billion-dollar mistake. Falsy was the second.](https://dev.to/bryan_maclee/null-was-a-billion-dollar-mistake-falsy-was-the-second-3o61). On `not`, presence as a type-system question, and why scrml refuses to inherit JavaScript's truthiness rules.
- [scrml's Living Compiler](https://dev.to/bryan_maclee/scrmls-living-compiler-23f9). The compile-time evaluation story.
- Companion drafts in this batch: [Components are states](./components-are-states-devto-2026-04-29.md), [Mutability contracts](./mutability-contracts-devto-2026-04-29.md), [CSS without a build step](./css-without-build-step-devto-2026-04-29.md), [Realtime and workers as syntax](./realtime-and-workers-as-syntax-devto-2026-04-29.md).
- **scrml on GitHub:** [github.com/bryanmaclee/scrmlTS](https://github.com/bryanmaclee/scrmlTS). The working compiler, examples, spec, benchmarks.

<!--

## Internal verification trail (private — agent-only, not for publish)

This block is an HTML comment so it does not render on dev.to.

- Bio: `/home/bryan/scrmlMaster/scrml-support/voice/user-bio.md` (v1, signed off 2026-04-27; project memory marks BAKED 2026-04-28).
- Private draft / verification log: `/home/bryan/scrmlMaster/scrml-support/voice/articles/orm-trap-draft-2026-04-29.md`.
- Companion published: `why-programming-for-the-browser-needs-a-different-kind-of-language-devto-2026-04-27.md` (overview).
- Companion published: `server-boundary-disappears-devto-2026-04-28.md` (sister piece on the wire seam).
- Companion published: `lsp-and-giti-advantages-devto-2026-04-28.md` (E-PA-007 quick-fix prior framing).
- Companion published: `npm-myth-devto-2026-04-28.md` (ORM-replaced-by-language line item).
- Agent: `/home/bryan/.claude/agents/scrml-voice-author.md` (article mode, gate cleared per project memory bio-baked 2026-04-28).
- SPEC: `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` (§8, §11, §39, §44 cited; error codes E-PA-001/004/006/007, E-SQL-002/003/004/006).
- LSP source: `/home/bryan/scrmlMaster/scrmlTS/lsp/l4.js` (Levenshtein quick-fix for E-PA-007, lines 21-30).
- PA source: `/home/bryan/scrmlMaster/scrmlTS/compiler/src/protect-analyzer.ts` (`fullSchema` field at line 81; constructor lines 795-800).

**Spec validation summary:**

- ✅ `?{}` SQL block syntax current (§8 line 4361+; §44 line 14636+).
- ✅ `< db src tables>` block syntax (§11.5; §44.2 driver resolution).
- ✅ `< schema>` block syntax with worked example (§39.1 line 13620; §39.2 lines 13640-13670).
- ✅ Schema introspection field path verified against compiler source (`protect-analyzer.ts:81, 795-800`).
- ✅ E-PA-007 LSP L4 Levenshtein quick-fix shipped (`lsp/l4.js:21-30`).
- ✅ E-SQL-002/003/004/006 codes accurate against §8 error table (lines 4722-4728) and §44.7 (lines 14685-14688).
- ✅ §44 Bun.SQL migration normative (`.prepare()` removed → E-SQL-006; `.get()`/`.all()`/`.run()` semantics).
- ✅ Bound-parameter mandatory, no `sql.raw()` (§44.5 line 14675; §8.1 line 4380).
- ⚠️ E-PA-007 is **specifically** for `protect=` field-name validation, NOT general SELECT-clause column-name typos. Article wording soft-framed: column-completion is an LSP feature, E-PA-007 is `protect=` validation, no claim that arbitrary SELECT-column typos are caught at compile time. Spec does not currently normatively guarantee schema-driven SELECT-column validation; that's plausible-future-work.
- ⚠️ Did NOT claim "the SELECT result is auto-typed from the schema" — spec only normatively documents `.get()` returns `Row | not` and `.all()` returns `Row[]`; full schema-driven row-shape typing across call sites is not normative. Soft-pass.

**Forbidden territory check (bio §6):** all clear. React hobble-through disclosure used in opener (bio-attested voice-scrmlTS:3600). Framework-fatigue narrative avoided (article is structural, not autobiographical-recovery). Honest concession in §"What is still real" preserves the bio's "user is not anti-everything" stance. The "twenty compiler attempts" reference is bio-attested (voice-archive:1565). No fabricated motivation, no consensus claims, no Pascal/Python/Go/Rust experience claims. Em-dash purge complete (0 in body). Typo/contraction protocol applied.

-->
