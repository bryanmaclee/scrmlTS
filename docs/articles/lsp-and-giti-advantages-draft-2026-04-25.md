# What scrml's LSP can do that no other LSP can — and why giti follows from the same principle

**Draft — 2026-04-25.** A piece on the two pieces of the scrml ecosystem most often dismissed as "well, it's a small language, of course the tooling is thinner" — when in fact both are *more* capable than mainstream alternatives because they sit downstream of a single integrated compiler that owns markup, logic, SQL, components, and reactivity in one AST.

If you remember one thing: **mainstream LSPs are unions of partial language services. scrml's LSP is a single service that knows every context.** That structural difference unlocks features the union model literally cannot ship. Giti is a parallel structural argument — a version control surface designed for the median developer, with the scrml compiler as its review gate — and the same "single integrated thing knows everything" pattern is what makes it possible.

## Part 1 — The LSP

### Why mainstream LSPs hit a ceiling

Take Vue. A `.vue` file has three contexts: `<template>` (HTML), `<style>` (CSS), `<script>` (TypeScript). Volar — Vue's LSP — solves this with a thin LSP shell that delegates each region to a dedicated language service: HTML service, CSS service, TS service. To get TS-level features inside the template, Volar transforms the SFC to virtual TypeScript (`svelte2tsx`-style) and asks tsserver. It works, and it's a real engineering achievement. But the union approach has a hard ceiling: each per-context service knows only its own context.

The thing every Vue dev has hit: you can't get column completion in a SQL string inside a Vue script setup, because no Vue language service knows your SQL schema. The Volar architecture *can't* know — neither the TS service nor the CSS service nor the HTML service was designed to understand a SQL DSL embedded inside a string literal. You'd have to write a new "SQL inside JS string templates" plugin, plumb it into Volar's per-context dispatch, and then teach it about your specific schema source. Nobody does this.

dbt has a SQL LSP. It does column completion against a schema. But dbt's LSP knows only SQL — your application code is invisible to it.

That's the union-of-services ceiling: each service is good at its one context, but the *interesting* completions are at the boundaries between contexts.

### Why scrml doesn't hit it

scrml's compiler owns every context in one AST. A `.scrml` file's markup, logic, components, SQL, CSS, and reactive declarations are all parsed by the same pipeline (BS → TAB → AST → BPP → PA → RI → TS → DG → CG → CE → ME → MC). The PA (Protect Analyzer) pass already builds a `views` map from `<db>` blocks containing each table's full schema. That data is sitting in memory the moment the LSP runs analysis on a buffer.

So when you type:

```scrml
<db src="./app.db" tables="users,posts">

server fn list_recent() {
    return ?{`
        SELECT u.|     -- cursor here
        FROM users u
    `}.all()
}
```

…the LSP can:

1. Detect the cursor is in a SQL context.
2. Parse the partial SQL to find table alias `u` resolves to `users`.
3. Pull the column list for `users` from `paResult.protectAnalysis.views.get("users").fullSchema`.
4. Return those columns as completions, each labeled with its SQL type, primary-key/index status, and protected-field status.

This is **a feature zero competitor LSPs offer**, because no competitor LSP owns both your application code AND your database schema in the same analysis pass. dbt's LSP knows your SQL but not your application. tsserver knows your application but not your SQL strings. Volar knows your Vue template but not your SQL strings. The union model can't get there from here.

The same structural argument extends to:

### Cross-file component prop completion

```scrml
// components/card.scrml
export const Card = <article props={ title: string, body: string, publishedAt: Date }>
    <h2>${title}</>
    <p>${body}</>
    <span class=date>${publishedAt}</>
</article>

// pages/index.scrml
import { Card } from "../components/card.scrml"

<Card title="Hi" |    -- cursor here
```

The LSP suggests `body=`, `publishedAt=`. Cross-file. Driven by a derived prop registry built from `ComponentDefNode.raw` parsed at workspace-bootstrap time. **The L3 phase of the LSP roadmap landed this in S40** — works against `export.raw` synthesized component-defs, not just same-file components.

A React or Vue dev reading this is thinking "my IDE has done this for years." Yes — for components written in JSX or SFCs that tsserver / Volar can analyze. **scrml's version works for components defined in markup-first source that tsserver and Volar would never touch.** And it works because `<Card title="Hi"` and `<article props={...}>` are nodes in the same AST pass.

### Cross-file go-to-definition that's actually accurate

This is the table-stakes feature TypeScript devs ship by default. scrml shipped it in L2 (S40) via a workspace cache that holds:

- `exportRegistry: Map<filePath, Map<exportName, ExportInfo>>`
- `fileASTMap`
- `importGraph`

The cache rebuilds on `didChange` / `didOpen`; if the touched file's export shape changed, ALL open buffers re-analyze. F12 on a cross-file `Card` jumps to the `ComponentDefNode.span` in `components/card.scrml`. F12 on an imported function jumps to the `export-decl` span. Same file or other file — same code path.

This is unremarkable in mature LSPs. It is remarkable that scrml — a young language — has it working today, because the alternative was the route most young languages take: same-file go-to-def, "cross-file is a future feature," and the dev experience suffers for years. The structural reason scrml could ship it early is the same one that makes SQL completion possible: one compiler owns everything, so wiring MOD output (the export graph) into the LSP is one cache layer, not one cache layer per language service.

### Code actions that quick-fix scrml-specific errors

L4 (S40) shipped `codeActionProvider` quick-fixes for:

- **E-IMPORT-004** — Levenshtein-rank closest exported name from the imported module's actual exports. ("`Cardd` not exported from `./card.scrml`. Did you mean `Card`?")
- **E-IMPORT-005** — bare specifier missing `./` prefix. (Auto-prefix.)
- **E-LIN-001** — unconsumed linear value. (Auto-prefix the binding with `_` to silence.)
- **E-PA-007** — column not in table schema. **Levenshtein-ranks the closest column from PA's `views`.** ("`name` not in `users`. Did you mean `username`?")
- **E-SQL-006** — `.prepare()` removed in §44 Bun.SQL migration. (Strip the call.)

Notice E-PA-007 — the quick-fix is "did you mean `username`?" pulled from the schema introspection that PA already did. **This requires the LSP to have your DB schema in the same analysis pass as your error diagnosis.** Other tooling stacks have to either ship a separate "schema linter" tool that doesn't know your application code, or skip the suggestion. scrml's LSP suggests it inline.

### Signature help that crosses files

L4 also shipped `signatureHelpProvider` triggered on `(` and `,`. For cross-file imported functions, the LSP synthesizes the function shape from the export's `raw` source (parsed at workspace-bootstrap). So:

```scrml
import { computeTotal } from "./billing.scrml"

const total = computeTotal(|    -- cursor here, signature popup shows:
                                --   computeTotal(items: List<Item>, taxRate: Number)
                                --                ↑ active param
```

…works without the called function's source being open in the editor.

### Hover with reactive/tilde badges + state field types

Same-file or cross-file, hover shows:
- function signature + boundary (server vs. client)
- reactive variable badges (`@count` is reactive; `~tmp` is tilde-decl)
- struct field types from `<state>` blocks
- enum variant payload shape

This isn't novel by itself — every LSP does hover. The differentiator is what's *in* the hover. The "boundary" badge is impossible in TypeScript LSP because TS doesn't have a server/client boundary concept — that's a scrml runtime invariant the compiler enforces (boundary security, §S39 deep-dive). Showing it in hover means a dev never has to wonder "is this function safe to call from client code?" — the LSP tells them on mouse-over.

### Document symbols with semantic meaning

The outline panel (L1, S40) populates with: `<state>` blocks, components, server/client functions, machines, `<db>` blocks. Each gets a symbol kind (Variable / Class / Function / Module) appropriate to scrml's mental model, not JS's. A scrml dev sees their `state` blocks as first-class entities in the outline; a TS dev with a similar Zustand store sees a generic function. The LSP can show the structure the dev actually thinks in.

### What's deliberately NOT shipped (and why)

- **Semantic tokens (L5)** — formally dropped from the active roadmap per a 6nz consultation. 6nz is the editor in the scrml ecosystem and is moving toward spatial annotation panels, where coloring is a side channel, not the primary signal carrier. TextMate handles broad-strokes coloring fine. Semantic tokens would be sunk cost.
- **Find-references** — pending. Will use the workspace cache (already built for L2/L3).
- **Rename-symbol** — pending. Same dependency.
- **Workspace-symbol search** — pending. Cheap on top of the existing export registry.

The deferral pattern is informative: every L1-L4 capability either uses a single-file AST walk or the workspace cache. Nothing scrml's LSP is shipping today is built on top of speculative architecture; everything is downstream of pipeline stages that already exist for the compiler to do its main job.

### Summary

The LSP capabilities you can ship are gated by what the compiler can tell you. mainstream LSPs ship a union of per-context services because mainstream languages are unions of per-context tools. scrml's compiler owns every context, so the LSP can ask one analysis pass for everything — markup, logic, SQL schemas, component prop registries, cross-file imports, error-fix suggestions — and surface it without per-context plumbing.

That's why SQL column completion against your live schema is a 50-line LSP feature for scrml and an open research project for everyone else.

## Part 2 — Why giti follows from the same principle

scrml's LSP works because one compiler owns every context. Giti works because **one platform owns the entire collaboration surface**, and uses the scrml compiler as its review gate.

### Git's mental-model problem

The data is unambiguous:

- 52% of all developers struggle with git at least once a month
- 75% of self-described "confident" git users still struggle monthly
- 87% have hit merge conflicts they didn't know how to resolve
- 65% have lost commits or changes
- 55% find rebase error-prone
- 45% have been negatively affected by a colleague's force push

The standard response to these numbers is "users need more git education." giti's design rejects this. The mental model itself is the defect. Anything that requires understanding git internals — staging vs. working tree, detached HEAD, fast-forward vs. merge commits, the interaction between local and remote refs, what `git reset --soft` vs. `--mixed` vs. `--hard` actually does — is a defect in giti's surface, not a user education gap.

### The 5-function surface

```
giti save     — snapshot working state (no staging area; everything is included)
giti switch   — move to a different point in history
giti merge    — bring another line of work in
giti undo     — reverse the last operation
giti history  — show what happened
```

That's the entire daily-development vocabulary. There is no `add`. No `stash` (working copy IS a commit, courtesy of jj-lib's storage model). No `reset` family with three flavors. No detached HEAD. No `rebase --interactive`. No `cherry-pick`. No `reflog` to recover from a destructive operation, because no destructive operation exists at the surface.

The 5-function design wasn't pulled from the air. It was derived from actual usage data of the project that built giti:

- 767 saves
- 705 context switches
- 206 merges
- 146 undos
- 44 stashes (all orphaned — nobody recovered work from them; the stash model is broken)

5 operations cover what people *do*. The rest of git's surface is what people learn to *avoid*.

### The scrml compiler is the reviewer

86% of pull request lead time is waiting for human review. For solo developers and small teams, that's pure friction with no information gain — a human reviewer reads a 30-line diff and approves it because the change is obvious. The bottleneck doesn't add quality; it adds latency.

giti `land` runs the scrml compiler over the changed files and the test suite. If both pass, the change lands. If either fails, the dev gets the same error their LSP would show — same diagnostic, same E-code, same span. **There's no "the CI is broken but my local works" because the LSP and the gate share the compiler.**

For teams that DO need human review, giti supports it as a layered primitive (Landing → Stack → TypedChange, §6 of the spec). Human review still happens; it just isn't the only gate.

The structural argument is identical to the LSP argument: when one tool owns the whole pipeline, you can use it as the review surface. You can't do this with git+GitHub+CircleCI+Codecov+Sonar — those are independent services that have to negotiate. You can do it with giti+scrmlTS because they share an in-process compiler.

### Conflict-as-data instead of conflict-as-disaster

jj-lib (giti's underlying engine) treats conflicts as *first-class data* in the working copy, not as an error state that halts work. A merge with conflicts produces a working state that contains the conflict explicitly; you can keep editing, you can switch away and come back, you can run tests against the conflicted state. The "you can't do anything until you resolve the conflict" failure mode that everyone has hit in git doesn't exist at giti's surface.

The longer-term play (spec §3.7, "engine independence gate") is that scrml's compiler can do AST-level conflict resolution that text-merge tools can't: when two devs renamed the same function in different ways, the compiler knows which references resolve to which definition, and the merge proposes a coherent answer instead of "here are conflict markers, you sort it out."

### Private scopes instead of `.gitignore` + private repos

scrml apps frequently have files that are local-dev-only — secrets, machine-specific config, private notes. The git answer is "keep two repos" or "abuse `.gitignore` and pray." giti has private scopes (§12): a `.giti/private` manifest, glob-based, with engine-level routing that keeps private commits on a `_private` bookmark and refuses to push private content to public remotes.

Slices 1-5 have shipped (private add/remove/list, remote scope config, save-time scope classification, push safety, automatic split for mixed working copies). The mechanism is part of the platform, not a workaround over it.

### Crash recovery built in

Because jj's working-copy-is-a-commit model continuously tracks the working directory, unsaved edits are recoverable after a crash. A process kill between saves doesn't destroy work; `giti undo` or `giti history --ops` shows the last working state. There is no equivalent to "I forgot to commit and lost three hours of work."

### The shared structural argument

Both LSP and giti make the same bet: when one piece of software owns the whole surface, you can ship features that piecewise alternatives cannot. The LSP knows your DB schema and your application code in the same analysis pass, so it can suggest "did you mean `username`?" for an unknown SQL column. giti knows your compiler and your test suite as in-process libraries, so it can use them as the review gate without a CI round-trip.

The Volar/dbt/tsserver world cannot get to scrml's LSP capabilities by adding more services — the integration cost grows quadratically with the number of contexts. The git/GitHub/CI world cannot get to giti's land workflow by adding more bots — the negotiation cost grows quadratically with the number of integrations.

Vertical integration of a thoughtful design is the only path through this. scrml + giti is what that path looks like.

---

## Notes for revision

- Audience: developers who'd dismiss scrml as "small language → thin tooling" and have not actually tried it. Also useful for adopters who want to defend the choice in a team conversation.
- Length: ~2,000 words. Could be split into two articles (one LSP, one giti) if individually published.
- Tone: confident, not defensive. Lead with the structural argument, support with concrete examples, name the comparators specifically (Volar, dbt, tsserver, Git, GitHub).
- Things to verify before publication:
  - L1-L4 capability list is current (last verified S40 close, 2026-04-25).
  - 6nz semantic-tokens deferral is still valid (was confirmed 2026-04-25 in inbox reply).
  - giti private-scopes slice numbers (1-5 shipped per master-list).
  - Statistics in the giti section have a citation in `giti-spec-v1.md` §1.2 — verify before external publication.
  - Boundary security deep-dive reference (§S39) — verify the publicly-published version uses neutral phrasing if needed.
- Possible companion piece: "What 6NZ adds on top — spatial annotations as a primary signal carrier."
