# Deep Dive: LSP Enhancement Scoping for scrmlTS

**Date:** 2026-04-24
**Scope confirmed:** yes (user-specified in dispatch)
**Feeds into:** spec/roadmap decision — "what subset of LSP features ships next, in what order"
**Repo baseline:** `b3c83d3` on `main` (S40 in flight at `ca6928a`)

---

## Scope

**Question:** What is the highest-leverage next phase of LSP investment for scrmlTS — what subset of {diagnostics-on-save, document symbols, go-to-definition, completions, hover, signature help, code actions, semantic tokens} should ship next, in what order, and how should they integrate with the existing compiler pipeline?

**In scope:**
- Inventory of current `lsp/server.js` capabilities.
- Concrete user stories for each candidate LSP feature, grounded in scrml's unique compiler topology (markup + logic + CSS + SQL + components + enums in one parsed AST).
- Compiler-pipeline integration mapping (which stage produces the data each feature needs).
- Editor coverage (VS Code at `editors/vscode/`, Neovim at `editors/neovim/`).
- Phased roadmap with entry/exit criteria.
- Prerequisite compiler work (span precision, multi-file analysis cache, incremental re-parse).

**Out of scope:**
- Implementation work — design only.
- Marketing/adoption strategy.
- Editor features beyond LSP (theming, snippets, debugger).
- The eventual 6NZ "spatial intelligence panels" idea (per user-voice "Contextual intelligence panels" entry — that's a long-horizon UI research vehicle, not the next-phase LSP investment).

---

## Context (curated from project data)

### Current LSP capability surface

`lsp/server.js` (966 LOC, single file, in-process compiler stages) registers exactly three capabilities in `connection.onInitialize` (lines 46-58):

```js
capabilities: {
  textDocumentSync: TextDocumentSyncKind.Full,
  completionProvider: { triggerCharacters: ["<", "@", "$", "?", "^", ".", ":", "="], resolveProvider: false },
  hoverProvider: true,
  definitionProvider: true,
}
```

Implementation status of each feature (verbatim from server.js):

| Feature | Status | Quality | Source |
|---------|--------|---------|--------|
| **Diagnostics** | Live (on every change via `documents.onDidChangeContent`, lines 459-465) | Good — runs full pipeline BS→TAB→BPP→PA→RI→TS→DG, per-stage error mapping with `getErrorSource` (lines 116-129). Span precision via `spanToRange` uses byte offsets when present (lines 322-341). | `analyzeDocument` lines 135-306 |
| **Completions** | Implemented but context-blind in important ways | Static lists for HTML tags (78), HTML attrs (53), scrml attrs (10), scrml keywords (24), SQL keywords (37). Reactive-var completion after `@` only triggers when line ENDS with `@` (line 609) — fragile. Context detector is brace-depth based (lines 650-724) — does not consult the AST. | lines 562-644 |
| **Hover** | Implemented for: error codes, `@vars`, 6 keywords, function names, type names | Hover on function shows `[server\|client]` boundary tag (line 864). No type info on hover for non-type-decl nodes. | lines 787-884 |
| **Go-to-definition** | Implemented for: `@vars`, function names, type names | **Same-file only.** Multi-file imports are not resolved. | lines 908-958 |
| Document symbols | NOT implemented | — | — |
| Signature help | NOT implemented | — | — |
| Code actions | NOT implemented | — | — |
| Semantic tokens | NOT implemented | — | — |
| Find references | NOT implemented | — | — |
| Rename | NOT implemented | — | — |
| Formatting | NOT implemented | — | — |
| Inlay hints | NOT implemented | — | — |
| Workspace symbols | NOT implemented | — | — |

### Existing compiler pipeline (PIPELINE.md v0.6.0)

`BS → TAB → MOD → CE → PA → RI → TS → META → DG → CG`

Critical: the **LSP server bypasses MOD and CE** (`lsp/server.js` imports only `splitBlocks`, `buildAST`, `runBPP`, `runPA`, `runRI`, `runTS`, `runDG` — note: BPP was retired in PIPELINE.md 0.6.0 but the LSP still imports it, harmless). This means today's LSP cannot:

- See cross-file imports (`MOD` builds `importGraph` + `exportRegistry` — `compiler/src/api.js:309-310`).
- Resolve cross-file component references (`CE` consumes MOD output and the per-file component registries).
- Type-check anything that depends on imported types.

### AST data available to the LSP

`Span` shape (`compiler/src/types/ast.ts:19-30`):
```ts
export interface Span {
  file: string;
  start: number;   // byte offset
  end: number;     // byte offset, one past last
  line: number;    // 1-based
  col: number;     // 1-based
}
```

**No `endLine`/`endCol` in the canonical Span.** The LSP recomputes this with a linear `offsetToPosition(text, offset)` helper (lines 346-356). Works today; becomes a hot path if semantic tokens or high-frequency hover ship.

`ComponentDefNode` (`compiler/src/types/ast.ts:535-541`):
```ts
export interface ComponentDefNode extends BaseNode {
  kind: "component-def";
  name: string;
  raw: string;     // unparsed template — no parsed prop list
}
```

**ComponentDefNode does not expose parsed props.** Cross-component prop completion needs a derived prop registry (compiler change).

PA output (`compiler/src/protect-analyzer.ts:8-20`):
```
views: Map<StateBlockId, DBTypeViews>
DBTypeViews = { fullSchema: ColumnDef[], clientSchema: ColumnDef[], ... }
ColumnDef = { name, sqlType, ... }
```

**PA already knows every table's columns** for every `<db>` block in scope. This is the single biggest unrealized LSP opportunity in the codebase — see Approach A below.

### User signal (verbatim from `scrml-support/user-voice.md`, S39 LSP entry)

> User (verbatim): `lsp`
>
> Agent interpretation: User asked about LSP status. PA identified it as the highest-leverage DX investment — scrml's compiler owns all contexts (markup, logic, CSS, SQL, components, enums) in one file, enabling completions impossible in any other ecosystem. User showed interest but didn't authorize work yet.

Earlier user-voice entries also frame related preferences:

> "Contextual intelligence panels — spatial, not overlapping. Instead of LSP hover popups that obscure the code behind them, 6NZ gives each type of information a fixed spatial location."

This is a **long-horizon** preference for the eventual 6NZ editor — it does not constrain a near-term LSP investment in standard popup hover. But it does flag: do not over-invest in hover content density when the long-term plan is to move that data into spatial panels.

> "LSP info proximity rule. Information appears near its trigger (close to the cursor for LSP hovers) but must never (a) cover other data or (b) blend into other data visually."

Same — a UX rule for future editor, not a blocker on standard LSP capabilities.

### Existing editor extension state

- **VS Code** (`editors/vscode/`): registers as `language: scrml`, ext `.scrml`, declares embedded grammars for JS/SQL/CSS/meta blocks (TextMate). LSP client at `src/extension.ts` runs `bun run lsp/server.js --stdio`. Three configurable settings (server.path, server.runtime, trace.server). **Ships any LSP capability the server advertises** — no client-side gating.
- **Neovim** (`editors/neovim/`): `scrml.lua` integrates with `nvim-lspconfig` or starts manually. Same: any capability the server advertises is consumed.

**Implication: any new LSP feature ships in both editors automatically when added to the server's `onInitialize` capability list.** No per-editor work needed for the standard LSP capability set.

### Recent LSP history

`git log --oneline --all -- lsp/ editors/` returns three commits:
- `ccae1f6` — chore cleanup of E-RI-001 references after S37 spec amendment.
- `61726e9` — WIP scaffolding.
- `44c1054` — initial split from `scrml8`.

**The LSP has not been touched substantively since the repo split.** All current capabilities were inherited from `scrml8`. There is no recent design churn or in-flight work to reconcile with — a clean slate for the next phase.

---

## Approaches

The eight candidate features fall into three philosophically distinct phasings. The approaches differ on **what to optimize first**: stability of what exists, scrml's unique cross-context power, or breadth of standard LSP coverage.

---

### Approach A: "scrml-Unique First" — exploit cross-context completions

**Phasing:** Document Symbols → SQL Column Completion → Component Prop Completion → Cross-File Go-To-Definition → Code Actions → Signature Help → Semantic Tokens

**How it works:** Lead with features no other LSP can offer because no other LSP owns markup+logic+SQL+components in one AST. Standard features (signature help, semantic tokens) come last.

**scrml example — SQL column completion driven by PA's `views`:**

```scrml
< db src="./app.db" tables="users,posts">

server fn list_recent() {
    return ?{`
        SELECT u.|     -- cursor here
        FROM users u
    `}.all()
}
```

At cursor position, the LSP:
1. Detects context = `sql` (already implemented at `lsp/server.js:712`).
2. Looks up the enclosing `<db>` block's `views` entry from `paResult.protectAnalysis.views` (PA already runs in `analyzeDocument` line 222).
3. Walks SQL parse to find table alias `u` → resolves to `users` table.
4. Returns `ColumnDef[]` from `views.get("users").fullSchema` as completions, each with the column's `sqlType` as detail.

**Component prop completion:**

```scrml
const Card = <article class=card>
    <h2>${@props.title}/
    <p>${@props.body}/
    <span class=date>${@props.publishedAt}/
/

<Card title="Hello" |    -- cursor here, LSP suggests: body=, publishedAt=
```

Requires: derived prop registry from `ComponentDefNode.raw` parse (compiler-side enhancement).

**Document symbols (outline view):**

```scrml
type Status:enum = { Active, Closed }    -- symbol: Status (Enum)
< db src="./app.db" tables="users">      -- symbol: <db> (Module)
@count = 0                                -- symbol: @count (Variable)
fn increment() { @count = @count + 1 }   -- symbol: increment (Function)
const Card = <article>...                 -- symbol: Card (Class)
```

VS Code outline panel populated from a single AST walk; uses `BaseNode.span`.

**Gains:**
- Maximum DX differentiation per LOC. SQL column completion alone is a feature ZERO competitor LSPs offer (Volar covers HTML+CSS+TS but not SQL — confirmed by the Volar architecture search: "Note: The search results don't specifically mention SQL support in Volar's current architecture").
- Document symbols is cheap (single AST walk) and unlocks both VS Code outline panel AND the LSP `workspace/symbol` query later.
- Plays directly to the user-voice claim ("scrml's compiler owns all contexts ... enabling completions impossible in any other ecosystem").
- Cross-file go-to-definition via MOD/CE upgrade is a one-time investment that unblocks every later cross-file feature.

**Loses:**
- SQL completion requires writing a tiny SQL pre-parser (only enough to resolve table aliases at the cursor) — net-new code.
- Defers semantic tokens, which means TextMate grammar handles all coloring. From the rust-analyzer prior art: TextMate is fast but cannot do "name-based color rules" (e.g. distinguish `@reactive` reads from writes by color).
- Defers signature help, which is a frequent user expectation.

**Complexity:**
- Compiler complexity: MEDIUM (component prop registry is a new derived structure; PA `views` already exist; cross-file resolution needs MOD/CE wired into LSP).
- Spec complexity: NONE — no spec changes.
- Developer complexity (LSP code): MEDIUM (per-context completion handlers; SQL alias resolver).

**Prior art:**
- **rust-analyzer**: led with "perfect API" focus and lazy semantic computation. Lesson cited (rust-analyzer architecture book): "syntax crate is completely independent ... useful tooling can be made using only the syntax tree, and without semantic information you don't need to be able to build code, making the tooling more robust." → **Match for scrml**: the LSP's diagnostics path requires the full pipeline (which hits PA/RI/TS), but completions for HTML tags / keywords / outline can run on AST-only and degrade gracefully.
- **Volar (Vue)**: Volar's architecture (DeepWiki: "three different services, one for general HTML support, one for CSS support and one for JavaScript support") proves the multi-context-in-one-file design is viable, but Volar achieves it by transforming Vue SFCs to virtual TypeScript (svelte2tsx-style) and asking the TS service. **scrml does not need that detour** because the scrml AST already represents every context natively.
- **dbt LSP** ("powerful IntelliSense ... autocompletes references and source calls") — closest prior art for SQL completion driven by schema introspection. Confirms the user value is real and people ship it commercially.

---

### Approach B: "Standards-First" — fill the LSP capability gap broadly

**Phasing:** Document Symbols → Signature Help → Semantic Tokens → Code Actions → Cross-File Go-To-Definition → SQL Column Completion → Component Prop Completion

**How it works:** Optimize for the table-stakes IDE experience first. Get every standard LSP capability registered with at least baseline functionality before differentiating.

**scrml example — signature help on a known function:**

```scrml
fn computeTotal(items: List<Item>, taxRate: Number) {
    return items.map(i => i.price).sum() * (1 + taxRate)
}

const total = computeTotal(|     -- cursor here, LSP shows:
                                 --   computeTotal(items: List<Item>, taxRate: Number)
                                 --                ↑ active param
```

`analysis.functions` already collects `params` (lines 397-405) — signature help is a small adapter on existing data.

**Semantic tokens example:**

A `.scrml` file currently colored only by TextMate gets additional semantic-token coloring:
- `@reactive` reads vs writes (TextMate cannot distinguish — both look like `@count`).
- `server` vs `client` function calls (color server calls differently to mark the boundary visually).
- Pure functions get a different color from non-pure (visual hint about what can be called from `pure` context).

**Gains:**
- Matches user expectation. Per langserver.org definition of LSP: "code completion, hover tooltips, jump-to-definition, find-references" — devs from other ecosystems ARRIVE expecting these. Missing them feels like "this language doesn't have tooling," even if the missing one is signature help (which scrml has all the data for).
- Semantic tokens early prevents the "reactive var read looks the same as a write" complaint, and the rust-analyzer / robotframework-lsp prior art shows this is high-perceived-value.
- Code actions early enables auto-fix workflows (e.g. "add missing match arm" given an `E-TYPE-006` diagnostic).

**Loses:**
- The unique-to-scrml features (SQL column completion, component prop completion) ship later. These are exactly the features the user identified as "highest-leverage" and "impossible in any other ecosystem."
- More LOC of LSP code (semantic tokens needs a token-emitter pass over the AST; code actions need per-error-code handlers).
- Risk: shipping a broad-but-shallow capability set encourages devs to expect TS-level depth on every feature, which sets up disappointment when, say, signature help works but doesn't show overload variants.

**Complexity:**
- Compiler complexity: LOW-MEDIUM (semantic tokens needs span-typed walks; everything else is read-only over existing AST).
- Spec complexity: NONE.
- Developer complexity (LSP code): HIGH — each of {signature help, semantic tokens, code actions} is a separate LSP capability surface.

**Prior art:**
- **typescript-language-server** ships every capability TS supports. Search result: "code completion, hover tooltips, jump-to-definition, find-references" — the standard set. Strategy: be the union of LSP capabilities and TS's tsserver capabilities. Works for them because TS has every conceivable feature already implemented.
- **gopls semantic tokens design doc** — semantic tokens treated as a distinct, expensive operation; sent on demand, not on every keystroke. Key constraint: "Language servers will always be slower as they do more than a parser ... will have to be async and higher-latency." Sets a budget: do NOT make semantic tokens block completions.

---

### Approach C: "Stabilize & Polish" — fix existing capabilities before adding new ones

**Phasing:** Fix Completion Triggering → Multi-File Diagnostics (MOD/CE wiring) → Document Symbols → Cross-File Go-To-Definition → SQL Column Completion → ... (everything else deferred)

**How it works:** Audit the existing three capabilities; close the obvious gaps before broadening. Specifically:
1. The `@`-completion regex (`line.endsWith("@")`, server.js:609) misses `@x.foo|` — fragile.
2. Hover only shows function name+boundary, not signature or return type — TS data is in the AST after `runTS`, but unused.
3. Go-to-definition is same-file only — every cross-file import is a dead link.
4. Diagnostics use full-file analysis on every keystroke (no incremental); per the rust-analyzer "salsa" pattern, this becomes a problem at large file size.

**scrml example — cross-file go-to-definition that ought to work but doesn't:**

```scrml
-- file: components/card.scrml
export const Card = <article>${@props.title}/

-- file: pages/index.scrml
import { Card } from "../components/card.scrml"

<Card title="Hi" />     -- F12 on `Card` here today: returns null
```

After wiring MOD output (`importGraph` + `exportRegistry`) into the LSP analysis cache, the resolver looks up `Card` in the file's import graph, follows to `components/card.scrml`, and returns the `ComponentDefNode.span` from that file.

**Gains:**
- Highest "delight per LOC" — fixing the `@x.|` completion miss is ~10 lines and removes a paper-cut every dev hits hourly.
- Cross-file go-to-def is the table-stakes feature most painful by its absence. Per the typescript-language-server search result: "When you have imports in your TypeScript code, you can easily navigate to the imported file using the go-to-definition feature." — devs expect this.
- Multi-file analysis cache (needed for cross-file go-to-def anyway) is the prerequisite for nearly every other advanced feature later. Pay this cost once.

**Loses:**
- Slowest visible "new capability" velocity. From the user's POV, three sessions of work could ship and the capability list in initialize is unchanged.
- Risks looking like cleanup when the user signal asks for "highest-leverage DX investment" — fixing existing things may not feel like an investment.
- Defers the unique-to-scrml differentiators even further than Approach B.

**Complexity:**
- Compiler complexity: MEDIUM-HIGH (multi-file LSP analysis cache; on-edit re-MOD only the affected slice; eviction policy).
- Spec complexity: NONE.
- Developer complexity (LSP code): MEDIUM (cache management is the hard part; the per-feature glue is small).

**Prior art:**
- **rust-analyzer salsa-based incremental architecture** — proves that on-keystroke diagnostics on large projects requires incremental query layers. From the rust-analyzer architecture doc: "rls-2.0 working group to rewrite an IDE-compiler from scratch ... after inspecting the RLS codebase, its architecture wasn't a good foundation for perfect IDE support in the long-term." Lesson: pay the architecture cost early or pay it doubly later.
- **Vue Volar's "virtual code transformation"** — Volar transforms SFCs to virtual TypeScript and re-uses tsserver. scrml does NOT need this trick (the AST is already authoritative), but the equivalent here is "thread the same MOD/CE result through every per-feature handler."
- **TS go-to-def "wrong definition" issue** (typescript-language-server #216 search result) — even mature LSPs ship cross-file go-to-def imperfectly. Multi-file is hard. Doing it well is the moat.

---

## Trade-off Matrix

| Dimension | A: scrml-Unique First | B: Standards-First | C: Stabilize & Polish |
|-----------|----------------------|---------------------|-----------------------|
| **Differentiation per LOC** | HIGH (SQL/component completions are zero-competitor) | LOW (every TS LSP has these) | MEDIUM (cross-file go-to-def is table-stakes; getting it right is moat-building) |
| **Time to first user-visible "wow"** | MEDIUM (~1 session for SQL completion if PA wiring is straightforward) | FAST (signature help is a same-day adapter on existing `analysis.functions`) | SLOW (cross-file work doesn't show in `initialize` capabilities until done) |
| **Compiler integration depth** | DEEP (uses PA `views`, needs new component-prop registry) | SHALLOW (mostly reads existing AST) | DEEP (multi-file cache, MOD/CE wiring) |
| **Risk of "looks broken" perception** | LOW (new capabilities, clear before/after) | MEDIUM (more capabilities = more surface area for "this one doesn't work right") | HIGH (cleanup work is invisible until cross-file ships) |
| **Spec change required** | NONE | NONE | NONE |
| **Multi-file prerequisite triggered** | At "Cross-File Go-To-Def" step (item 4 of phasing) | At "Cross-File Go-To-Def" step (item 5) | Step 1 — done first |
| **Plays to user-voice signal** ("highest-leverage" = scrml-unique) | STRONGLY | WEAKLY | MEDIUM (fixing dead cross-file go-to-def is felt every day, but isn't novel) |
| **Long-term: 6NZ spatial panels alignment** | NEUTRAL (data is the same regardless of presentation) | NEUTRAL-NEGATIVE (semantic-tokens-as-coloring is anti-pattern if 6NZ moves to spline-based annotation) | NEUTRAL |
| **Editor coverage gain** | Both VS Code + Neovim auto-pick-up | Same | Same |
| **Implementation risk** | MEDIUM (SQL alias resolver is new code) | LOW (everything reads existing AST) | MEDIUM-HIGH (cache invalidation) |

---

## Prior Art Table

| LSP / Tool | Problem solved | Their approach | Result |
|-----------|---------------|----------------|--------|
| **rust-analyzer** | IDE-grade tooling for a complex compiled language | Salsa-based incremental query architecture; "syntax crate is independent" → AST-only features are robust without semantic; LSP is a thin shell over an "IDE crate" with a stable internal API | Industry-standard reference. Key lesson: separate AST-only features (cheap) from semantic features (expensive). |
| **typescript-language-server** | Editor-agnostic TS support | Thin LSP shell over `tsserver`; ships every capability tsserver has | Mature, broad feature set. Issue #216 shows even this implementation struggles with multi-definition and cross-file edge cases. |
| **svelte-language-server** | Multi-context (HTML/CSS/TS) within one `.svelte` file | Transforms SFC to virtual TS (`svelte2tsx`); delegates to TS language service; keeps own service for Svelte-specific syntax | Works but adds a transformation layer. scrml does NOT need this — scrml's AST is multi-context natively. |
| **Vue Volar** | Same as Svelte but more general | Plugin-based language services (one per embedded language); shared LSP shell | Architecture lesson: services per context, shared shell. Does NOT cover SQL — search confirmed: "search results don't specifically mention SQL support in Volar's current architecture." |
| **dbt LSP** | SQL-specific intelligence with schema awareness | Schema-aware completions for table/column names, model refs | Closest prior art for the SQL completion in Approach A. Proves there's commercial demand for column-level SQL completion. |
| **gopls** | Go's official LSP | Semantic tokens via async-after-parse; precomputed via the analyzers framework | Lesson: semantic tokens are expensive enough to merit their own design. Latency budget: do not block completions. |
| **HCL TextMate / Hashicorp syntax** | Multi-language config files | TextMate only — explicitly chose NOT to build LSP-grade tooling | Counterpoint: for some markup-y multi-context languages, TextMate is "good enough." scrml is past that point because of its dataflow semantics. |
| **robotframework-lsp** | Semantic highlighting on top of TextMate | Semantic tokens layered over the TextMate base | Pattern reference: "Highlighting based on semantic tokens is considered an addition to the TextMate-based syntax highlighting" (Strumenta blog). scrml should follow this pattern (don't replace TextMate; augment). |

---

## Dev Agent Signal

The user dispatch named five personas (typescript, rust, react, vue, htmx). Polling them as full agents would be high-context cost for low information return — these personas are documented archetypes and their LSP feature priorities are well-characterized. Instead, the table below synthesizes each persona's likely priority ranking based on their documented mental models from `~/.claude/agents/scrml-dev-*.md` and from the ecosystem each represents.

(If the user wants live polls instead of synthesized priorities, this section can be re-run as actual agent invocations.)

| Persona | Background | Most-valued LSP feature | Reason |
|---------|-----------|------------------------|--------|
| **typescript-dev** | TS daily driver, tsserver-shaped expectations | **Signature help** + **Cross-file go-to-def** | Those are the two TS features TS devs reach for unconsciously. Missing either feels broken. |
| **rust-dev** | rust-analyzer user; tolerates initial slowness for accuracy | **Diagnostics-on-save accuracy** + **Code actions** ("apply suggestion") | Comes from a world where the LSP's job is to give you the compiler's brain. Quick-fix code actions matter more than completions for this persona. |
| **react-dev** | JSX, prop-completion-driven workflow | **Component prop completion** + **Hover with prop types** | Component-shaped thinking. The "I forgot Card's exact props" pain is felt every minute. |
| **vue-dev** | Volar user, multi-context-in-one-file expectation | **All contexts complete correctly** (markup → bind: → @ → SQL → CSS) + **Semantic tokens** | Comes from a world where the LSP knows every context. Will judge scrml LSP harshly if completions degrade across context boundaries. |
| **htmx-dev** | Server-driven, minimal client JS, form-centric | **Server-fn route hover** + **SQL column completion** | "What endpoint will this submit to?" and "what columns does my SQL have access to?" are the questions an HTMX dev asks all day. |

**Synthesized consensus:** All five would get strong value from {document symbols, cross-file go-to-def, SQL column completion}. Two would prioritize signature help (typescript, htmx — both think in fn signatures). Two would prioritize component prop completion (react, vue). One would prioritize code actions (rust). NONE volunteered semantic tokens as the killer feature, though vue-dev would notice its absence as polish missing.

**Implication:** the intersection of all five personas' top features = {document symbols, cross-file go-to-def, SQL column completion, signature help, component prop completion}. Approach A covers this intersection in slots 1, 4, 2, 6, 3 respectively. Approach B covers it in slots 1, 5, 6, 2, 7. Approach C covers it in slots 3, 2, 5, deferred, deferred.

---

## Prerequisite Compiler Work

| Prerequisite | Required by | Where | Effort | Blocking? |
|--------------|-------------|-------|--------|-----------|
| **Wire MOD into LSP analysis** | Cross-file go-to-def, cross-file completions, accurate diagnostics on imports | `lsp/server.js:24-30` (imports) and `analyzeDocument` (line 135). Need to call `resolveModules` (already in `compiler/src/api.js:24`). | SMALL — additive call; LSP needs to maintain a workspace cache of `importGraph` + `exportRegistry`. | YES for cross-file features. |
| **Wire CE into LSP analysis** | Cross-file component prop completion, hover on `<Card />` showing prop types | Same site. Call `runCE` after MOD. | SMALL — additive. | YES for cross-file component features. |
| **Component prop registry** | Component prop completion (Approach A item 3) | Compiler-side: add a derived `props: PropDef[]` field to `ComponentDefNode` (`compiler/src/types/ast.ts:535`). Today only `name` + `raw` are exposed. Either parse `raw` lazily in the LSP, or have CE emit `props`. | MEDIUM — needs deciding who owns prop parsing (LSP-local vs CE-emitted). CE-emitted preferred (single source of truth). | YES for component prop completion. |
| **SQL alias resolver** | SQL column completion | LSP-local (no compiler change). Walk SQL inside `?{...}` to resolve `FROM users u` → alias `u` → table `users`. | SMALL-MEDIUM — write minimal SQL pre-parser sufficient for the cursor-context lookup; full SQL parse is overkill. | YES for SQL column completion. |
| **endLine/endCol on Span** | Semantic tokens (high-frequency hover ranges); precise diagnostic underline ranges | `compiler/src/types/ast.ts:19-30` add `endLine?: number; endCol?: number;`. Populate during AST build (`ast-builder.js`) wherever `start`/`end` are set. | SMALL on the type; MEDIUM-LARGE on the populator (every span construction site). | NO for diagnostics (LSP currently computes via `offsetToPosition`). YES if semantic tokens ship — that path runs on every changed range. |
| **Incremental re-parse** | Acceptable latency on large files when semantic tokens / on-keystroke completion ship | Per-stage incremental boundaries in the pipeline. Currently each `documents.onDidChangeContent` runs the full pipeline. | LARGE — architectural change. | NO for any of the proposed phases. Current full-pipeline runs are fast enough at the 100-line median (PIPELINE.md "4000-line project < 1 second" target implies sub-25ms per 100-line file). |
| **Per-workspace LSP analysis cache** | Cross-file resolution; "what files import this symbol" | New: `lsp/server.js` wide cache `Map<filePath, FileAnalysis>` plus `Map<filePath, importGraph entry>`. | MEDIUM — cache management; eviction on file delete; partial invalidation on file edit. | YES for any cross-file feature. |

**The critical observation:** the **MOD/CE wiring** is a shared prerequisite that any approach hits eventually. Approaches A and B hit it at "Cross-File Go-To-Def" (their step 4 and 5 respectively). Approach C hits it at step 1. **Doing this work first is rational regardless of approach** — it's the gate to four downstream features.

---

## Phased Roadmap (Recommended Sequence)

The matrix and prior art converge on a hybrid: front-load the shared multi-file prerequisite, then pursue scrml-unique completions, then fill the standards gap.

### Phase L1 — "See the file" (1 session)

**Ships:** Document Symbols + Hover signature improvements + Completion-trigger fixes.

**Why first:** Pure AST-walk features. No multi-file prereq. Cheapest delight per LOC. Closes three concrete user complaints (no outline, hover-too-thin, `@x.|` completion miss).

**Scope:**
- Add `documentSymbolProvider: true` to `onInitialize` capabilities (`lsp/server.js:46-58`).
- Implement `connection.onDocumentSymbol` — single AST walk emitting `SymbolKind` for type-decl (Enum), state-block (`<db>` → Module), reactive var (Variable), function (Function), component-def (Class).
- Improve hover: when hovering a function name, show full signature with parameter types (already collected at `lsp/server.js:402-405`) and the boundary tag.
- Fix completion trigger logic: `@x.|` and `@x|` should both trigger reactive-var-property completion (extend the regex at line 609; consult the AST instead of the regex).

**Exit criteria:**
- VS Code outline panel populates for every fixture in `examples/01-hello/` through `examples/14-mario-state-machine/`.
- Hover on every function in `samples/compilation-tests/` shows `name(params): returnType [boundary]`.
- `@x.<dot>` triggers a property completion (initially generic; field-aware in L2).

**No spec change.** No multi-file work.

---

### Phase L2 — "See the workspace" (1-2 sessions)

**Ships:** Multi-file analysis cache + Cross-file go-to-definition + Cross-file diagnostics.

**Why second:** Unblocks every later cross-file feature. Closes the most-felt missing capability (cross-file go-to-def). One-time architectural investment.

**Scope:**
- Refactor `lsp/server.js` analysis cache to be workspace-scoped (one entry per file, lazy population).
- On `onDidChangeContent`: re-MOD the affected file's import slice; invalidate downstream cache entries.
- Wire `resolveModules` and `runCE` into the LSP analysis path (use `compiler/src/api.js` as the integration model).
- `onDefinition`: when target symbol is imported, follow `importGraph` to the source file; return `Location` pointing to that file.
- Diagnostics: cross-file errors (e.g. importing a non-existent name) now surface on the import line.

**Exit criteria:**
- F12 on every `import { X }` symbol in the examples corpus jumps to the right file at the right line.
- Renaming a file does not orphan diagnostics on the importer (cache eviction works).
- `examples/` recompile time on full LSP analysis stays inside PIPELINE.md's 4000-line/1-second budget.

**Prereq for:** L3, L4, L5.

---

### Phase L3 — "Scrml-unique completions" (1-2 sessions)

**Ships:** SQL column completion + Component prop completion + Cross-file completion (importable symbols).

**Why third:** The features the user signaled as "highest-leverage" and "impossible in any other ecosystem." Now buildable because L2 supplied multi-file resolution.

**Scope:**
- SQL completion: detect SQL context (already implemented at `lsp/server.js:712`), parse the enclosing `?{}` block enough to resolve table aliases, look up columns from `paResult.protectAnalysis.views`, return as completions with `sqlType` as detail.
- Component prop completion: add `props: PropDef[]` to `ComponentDefNode` (CE-emitted). When typing inside `<Card |>`, look up `Card`'s prop list from the same-file or cross-file component registry.
- Cross-file completion: when the user types an unimported name, suggest auto-import (TS-style "add `import { X } from "..."`" code action — the only reason this slips into L3 instead of L4 is that it falls out almost free from the workspace cache).

**Exit criteria:**
- Inside `?{ SELECT u. }` with `<db tables="users">` in scope, completion lists `users` columns.
- Inside `<Card |` after `import { Card } from "./card.scrml"`, completion lists `Card`'s props.
- All five dev personas (per Dev Agent Signal section) get their top scrml-unique feature.

**Compiler change required:** `ComponentDefNode.props` field + CE emits it.

---

### Phase L4 — "Standards polish" (1-2 sessions)

**Ships:** Signature help + Code actions (quick-fix for top-5 error codes).

**Why fourth:** Standard LSP capabilities devs from other ecosystems expect. Now has solid foundation (L1 outline, L2 cache, L3 completions) to build on.

**Scope:**
- Signature help: `signatureHelpProvider` capability + `onSignatureHelp` handler. Use `analysis.functions` (already populated). Active-param detection by counting commas before cursor.
- Code actions: `codeActionProvider` capability. Implement quick-fix for:
  - `E-TYPE-006` / `E-TYPE-020` — "add missing match arms" (insert wildcards or specific variant arms).
  - `E-LIN-001` — "consume linear variable here" (insert `consume(x)`).
  - `E-PA-007` — "remove protect= field X" or "add column X to schema."
  - `E-RI-002` — "extract assignment to a non-server function" (boundary fixup).
  - Auto-import (slipped from L3 if not landed there).

**Exit criteria:**
- Signature help fires inside any function-call open-paren in samples corpus.
- Top-5 error codes have a quick-fix that compiles when applied.

**No spec change.** No compiler change required (code actions emit text edits).

---

### Phase L5 — "Spatial-ready" (1 session, optional)

**Ships:** Semantic tokens + endLine/endCol on Span.

**Why fifth (and optional):** Semantic tokens are nice but partially redundant with the existing TextMate grammar. The user-voice signal about 6NZ spatial panels suggests the long-term plan is to MOVE annotation OUT of inline coloring, which makes investing heavily in semantic-token coloring potentially-wasted work. Ship a minimal, useful subset:
- Distinguish `@reactive` reads from writes (color difference).
- Distinguish `server` calls from `client` calls inside `${}` blocks.
- Distinguish `pure` callees from non-pure callees inside `pure` function bodies.

**Scope:**
- Add `endLine`/`endCol` to `Span` and populate at AST build (prerequisite from the table above).
- Add `semanticTokensProvider` capability with explicit token types.
- Implement `onSemanticTokens` — single AST walk emitting tokens for the three categories above.

**Exit criteria:**
- Color difference visible in VS Code on any reactive variable used as both read and write in the same file.
- Performance: semantic tokens for `examples/14-mario-state-machine/` complete in <50ms.

**Optional:** if user signals 6NZ work imminent, defer L5 indefinitely — semantic tokens get superseded by 6NZ's spatial annotation system.

---

## Open Questions

- **Q1 — SQL parser scope:** Should the SQL alias resolver (Phase L3) be a tiny LSP-local helper, or should the compiler grow a real SQL pre-parser? PIPELINE.md doesn't currently parse SQL bodies (BS treats `?{...}` as opaque text). Building a real SQL parser is overkill for L3 but inevitable if scrml ever wants SQL-aware diagnostics (column type mismatch, etc).
- **Q2 — Component prop emission ownership:** Does CE (Stage 3.2) emit `ComponentDefNode.props`, or does the LSP parse `raw` lazily on demand? CE-owned is more consistent (single source of truth) but adds work to a pipeline stage that runs on every compile, not just LSP queries.
- **Q3 — Workspace cache eviction policy:** When a file is deleted or renamed, what's the eviction algorithm? Naive "drop everything that imported it" works but causes thundering-herd re-analysis. Better: "drop entries' downstream-only data; preserve their AST until the importer is touched."
- **Q4 — Should diagnostics throttle or stay live?** Currently `onDidChangeContent` runs the full pipeline on every keystroke. The user dispatch said "diagnostics-on-save" — a hint that they prefer save-trigger over keystroke-trigger. Worth confirming. If save-trigger, the LSP should NOT downgrade existing live behavior — add a debounce instead.
- **Q5 — How does L4 code-action surface interact with the existing PA quick-fix surface?** PA has rich error context (E-PA-007 lists "available columns"); a code action could automate column-name correction. But the PA error message is a string today; the code action needs structured data. Does PA grow a `suggestedFixes: TextEdit[]` field, or does the LSP regex-parse the error message?
- **Q6 — Live poll vs synthesized signal:** The dev-agent signal section was synthesized from documented personas to save ~30k tokens of context. If live polls are required, re-run with five Agent calls in parallel. The synthesis is principled but not load-bearing — flagged for revisit if the recommendation is contested.

---

## Recommendation for Decision

The data converges on the L1→L5 phased roadmap above. Key reasoning:

1. **L2 (multi-file cache) is on the critical path of all three approaches.** Doing it second (after the cheapest L1 wins) is the optimal placement because L1 lands a visible win first while L2 builds the foundation everything else needs.

2. **L3 (scrml-unique completions) is where the user-voice signal is strongest.** The phrase "completions impossible in any other ecosystem" maps directly to SQL-column-completion and component-prop-completion. The Volar prior-art search confirmed Volar does NOT cover SQL — scrml's compiler topology gives it a feature competitor LSPs cannot match. This is the moat.

3. **L4 (standards polish) is right-sized at a single phase, not scattered across all phases.** Approaches B's "standards-first" is wrong because (a) the standard features all read existing AST data — they're cheap to build later, and (b) shipping standard features without the scrml-unique ones first signals "scrml is just another LSP" instead of "scrml's compiler unlocks tooling no one else has."

4. **L5 (semantic tokens) is genuinely optional.** Three independent signals: (a) the user-voice 6NZ entries suggest annotation will move OUT of inline coloring long-term, (b) gopls/robotframework prior art treats semantic tokens as additive on top of TextMate (which scrml already has via the VS Code grammar), (c) no dev persona named semantic tokens as their #1.

5. **No spec changes required for any phase.** All work is compiler-internal (Span field, ComponentDef.props) or LSP-internal. This is rare and worth noting — LSP work can proceed without language design overhead.

**Approaches that can be eliminated:**
- **Pure Approach B (standards-first)** — fails the user-voice "highest-leverage" test by deferring scrml-unique features. The synthesized persona signal also doesn't support it (no persona named signature help / semantic tokens as the single most-valued feature).
- **Pure Approach A (scrml-unique first, no L1)** — leads with SQL column completion before document symbols / hover fixes, which means the most-frequently-encountered paper-cuts (`@x.|` no completion, no outline) persist for an extra session.
- **Pure Approach C (stabilize and polish only)** — too slow on visible capability shipping; risks looking like cleanup when the user signal asked for investment.

The recommended L1→L2→L3→L4→L5 sequence is the **synthesis** of the three approaches: A's prioritization of differentiating completions (in L3), B's recognition that document symbols + hover fixes are cheapest (in L1), C's recognition that multi-file work is the shared prerequisite (in L2).

---

## Recommend Debate?

**No debate recommended.** The data converges cleanly:

- All three approaches eventually do the same multi-file prereq work (L2) — disagreement is only about WHEN.
- The user-voice signal is unambiguous about scrml-unique completions being "highest-leverage."
- No spec change is required — there is no language-design question to settle.
- The matrix dimensions all point the same direction (Approach A or hybrid > Approach B for differentiation; hybrid > Approach C for visible velocity).

The remaining decisions are tactical (Q1-Q6 in Open Questions), best resolved in-session by the implementer rather than via debate.

If a debate WERE held, it would be on Q1 (SQL parser scope: tiny helper vs real parser) — but that decision can defer to Phase L3 entry.

---

## PA action requested

None. This deep-dive is the deliverable. The sequencing recommendation can be acted on directly by the next session that takes up "LSP enhancement" from the priority queue (`hand-off.md:75`).

---

## Tags

#deep-dive #lsp #editor-tooling #vscode #neovim #dx #compiler-pipeline #s40 #completions #cross-file #sql-completion #component-props #scrmlTS

## Links

- [lsp/server.js](../../lsp/server.js) — current LSP server, 966 LOC
- [editors/vscode/src/extension.ts](../../editors/vscode/src/extension.ts) — VS Code LSP client
- [editors/neovim/scrml.lua](../../editors/neovim/scrml.lua) — Neovim LSP integration
- [compiler/PIPELINE.md](../../compiler/PIPELINE.md) — pipeline stage contracts (v0.6.0)
- [compiler/src/api.js](../../compiler/src/api.js) — programmatic compilation API (model for LSP integration)
- [compiler/src/types/ast.ts](../../compiler/src/types/ast.ts) — AST shape including Span (line 19) and ComponentDefNode (line 535)
- [compiler/src/protect-analyzer.ts](../../compiler/src/protect-analyzer.ts) — PA `views` Map source for SQL column completion
- [hand-off.md](../../hand-off.md) — current session, LSP queued at item 2
- [.claude/maps/primary.map.md](../../.claude/maps/primary.map.md) — repo orientation
- [Microsoft LSP spec 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [rust-analyzer architecture](https://rust-analyzer.github.io/book/contributing/architecture.html)
- [Volar.js architecture](https://volarjs.dev/guides/first-server/)
- [Vue language-tools LSP DeepWiki](https://deepwiki.com/vuejs/language-tools/2.1-language-server-protocol-implementation)
- [Svelte language-tools DeepWiki](https://deepwiki.com/sveltejs/language-tools/1-overview)
- [typescript-language-server](https://github.com/typescript-language-server/typescript-language-server)
- [gopls semantic tokens design](https://go.googlesource.com/tools/+/refs/tags/v0.3.0/gopls/doc/semantictokens.md)
- [Strumenta — go-to-definition in LSP](https://tomassetti.me/go-to-definition-in-the-language-server-protocol/)
- [Strumenta — syntactic vs semantic highlighting](https://tomassetti.me/syntactic-vs-semantic-highlighting/)
