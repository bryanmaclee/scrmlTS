# A-3 §40 AuthGraph — SCOPING

**Change-id:** `a3-auth-graph-scoping`
**Wave:** Approach A, sub-wave 3 (between A-2 Reachability Solver and A-4 per-route splitter).
**Status:** SCOPING (no implementation). Authored S89 against base SHA `9b98118` (HEAD); A-1 close at `376a219`.
**Author:** PA-dispatched scoping agent (worktree `agent-aeb3f2db2f564dd24`).
**Hard consumer:** A-2.5 Component 4 of the Reachability Solver (per `docs/changes/a2-reachability-solver-scoping/SCOPING.md` §5 line ~306 + §7.1 line ~528).

---

## §1 Background + Position

### 1.1 Slot in Approach A

Approach A (Insight 29 whole-stack closure analysis; SPEC §40.9; PIPELINE Stage 7.6) decomposes into five sub-waves:

```
A-1 (markup-context edge emission)   ─→ DG substrate           CLOSED S89 (`376a219`)
A-2 (Reachability Solver)            ─→ ReachabilityRecord     SCOPING landed (a2-reachability-solver-scoping)
A-3 (§40 auth-graph)                 ─→ AuthGraph              THIS DISPATCH
A-4 (per-route artifact splitter)    ─→ chunked output         deferred
A-5 (integration tests)              ─→ E2E coverage           deferred
```

A-1 closed S89 with **523 markup-read DG nodes + 523 reads edges** measured on the 61-file corpus (`docs/changes/a1-closeout/A1-7-ceiling-remeasurement.md`). A-2 SCOPING ratified §1-§9 with five blocking OQs + five non-blocking OQs (`docs/changes/a2-reachability-solver-scoping/SCOPING.md`).

### 1.2 Why A-3 exists — the A-2.5 hard-dependency

A-2.5 (Component 4 — `auth_gated_boundaries_visible_to(role)`) consumes the AuthGraph contract. From A-2 SCOPING §7.1 (line ~527-535, verbatim):

> **A-3 provides:**
> - `AuthGraph` — schema TBD by A-3 scoping; expected shape: `Map<MarkupNodeId, RoleClassification>` where `RoleClassification` is `{ closed_form: true; gated_for_role: Set<RoleVariant> } | { closed_form: false; gate_expr: ExprNode }`.
> - `RoleEnum` — `{ name: string; variants: RoleVariant[] }` from §40.1.1 app-scope declaration.

Without A-3 producing this contract, A-2.5 cannot compute per-role visibility classification — Component 4 falls back to a stub that returns "all in" for all roles, which under-prunes the closure and produces incorrect (over-large) chunks. A-3 is therefore on the critical path for A-2.5, A-4, A-5.

### 1.3 Parallelizability with A-2 early sub-phases

A-2 SCOPING line 48 (§1.3) + line 535 (§7.1) state explicitly:

> **A-3 is parallelizable with A-2's early sub-phases** (the AuthGraph schema is a fresh derivation; only Component 4 of A-2 needs to consume it). Hand-off-88 sequencing allows A-3 dispatch concurrent with A-2 once A-1 lands.
>
> A-2.5 (Component 4) is the only A-2 sub-phase blocked on A-3 output. A-2.1 through A-2.4 + A-2.6 can dispatch without A-3 if Component 4 is stubbed (returns "all in" for all roles).

Therefore A-3 can dispatch concurrent with A-2.1–A-2.4; only A-2.5 must wait on A-3.1 + A-3.2 (auth-site enumeration + role-enum resolution).

### 1.4 PIPELINE Stage 7.6 anchor

PIPELINE.md Stage 7.6 input contract line 2343:

> `AuthGraph` — derived from §40 auth-attribute classification on `<program>` / `<page>` / `<auth role=>` / `<channel auth=>` declarations

These four declaration sites are the AuthGraph's source surface. A-3 enumerates them, classifies per-role, cross-refs to RouteMap entry-points.

### 1.5 Existing compiler-side auth surface (inventory)

What A-3 inherits (already in compiler/src):

| Site | Status today | A-3 disposition |
|---|---|---|
| `<program auth=>` | Recognized; parsed into `AuthConfig` (ast.ts:1321); collected into `RouteMap.authMiddleware` per-file (route-inference.ts:135+2433). Accepts `"required"`/`"optional"`/`"none"` only. | Consume as-is (A-3.1 walks all `<program>` nodes via `fileAST.authConfig`). |
| `<page auth=>` | Recognized as attr (attribute-registry.js:157); allowed values `"required"`/`"optional"`/`"none"`; no per-page AuthConfig structural lift today (page auth is handled implicitly via filesystem inheritance from `<program>`). | Lift per-`<page>` to AuthGraph entry via attr-walker; cross-ref `fileAST.filePath` → entry-point in RouteMap.pages. |
| `<channel auth=>` | Recognized as attr (attribute-registry.js:191); allowed values `"required"`/`"optional"`/`"none"`; emitted in `emit-channel.ts:280` (`hasChannelAuth`). | Walk channel decls + lift to AuthGraph entry; cross-ref to ChannelDeclNode (`fileAST.channelDecls`). |
| `<auth role=>` block (per §40.9.9 worked example) | **NOT REGISTERED.** No `<auth>` entry in `compiler/src/html-elements.js`. No tag-equals-"auth" check anywhere in `compiler/src/`. Appears in SPEC §40.9.9 lines 17818-17820 as `<auth role="admin">...</auth>` but has no parser/walker/codegen registration. | **A-3.1 must register `<auth>` as a structural element** (analogous to how `<page>` was added in S85 Wave 2). Without this, `<auth role=>` blocks pass through as unknown markup tags and the AuthGraph misses them. |
| `<db protect=>` / field-level `protect=` | Field-level access control (S80 separation from `<channel auth=>`). Handled by Stage 4 Protect Analyzer. | OUT OF SCOPE — A-3 is gate-level (component-visibility) classification only. Field-level protect surfaces through a different boundary (server-fn boundary, not playable-surface). |
| `<auth check=await fn()/>` async-check form | Mentioned in SPEC §40.9.5 line 17724 ("`<auth check=await hasPermission(...)>` ... server function whose return is not a closed-form predicate") | A-3.3 classifier marks these as `closed_form: false` → A-2.5 fires `W-AUTH-RUNTIME-FALLBACK`. |

**Load-bearing finding (§1.5):** SPEC §40.9.9 worked example references `<auth role="admin">` as if it were a registered structural element, but no compiler-side registration exists. **This is the largest single piece of net-new work in A-3** — registering `<auth>` as a new structural element in `html-elements.js` + `attribute-registry.js` + adding it to the markup-AST walker recognition path. The infrastructure precedent is `<page>` (S85 Wave 2) and `<channel>` (S87 Insight 30 channel-architecture).

### 1.6 A-2 OQ ratifications relevant to A-3

A-2 SCOPING §8 surfaced 10 OQs. Three concern A-3 directly:

- **OQ-A2-E (ratified S89 per dispatch brief):** auth-redirect does NOT synthesize a new entry-point. A-3 just records the redirect target as a separate entry-point reference for cross-ref purposes. The redirect target's playable surface is computed independently (it's already its own entry point per §40.8 page enumeration).
- **OQ-A2-F (recommendation: author `E-CLOSURE-002`):** empty-role + auth-gates app. A-3 surfaces the auth-gates-present signal that A-2.5 consumes; the error code emission stays in A-2.5 (RS) per §34 fire-site convention.
- **OQ-A2-I (recommendation: RS fires `W-AUTH-RUNTIME-FALLBACK`):** A-3.3 classifies; A-2.5 fires the lint. A-3 does not emit diagnostics — it carries `closed_form: false` + the gate-expr through the contract.

---

## §2 AuthGraph schema (the deliverable)

### 2.1 Top-level

```typescript
// compiler/src/types/auth-graph.ts (NEW)

/** Output of A-3 §40 auth-graph derivation pass. Consumed by A-2.5 (RS Component 4) + A-4 (per-route splitter).
 *  Stage 5.5 RI-adjacent; computed AFTER RI (needs RouteMap.pages + RouteMap.authMiddleware as input). */
export interface AuthGraph {
  /** Per-gate classification — the consumer surface for A-2.5. Keyed by the MarkupNodeId
   *  of the gate-bearing element (a `<program>` / `<page>` / `<auth>` / `<channel>` markup node). */
  gates: Map<MarkupNodeId, AuthGate>;

  /** The app-scope role enum (per SPEC §40.1.1). Single enum in v0.3.0 scope — multiple-role-enums
   *  per compilation unit is deferred per §40.9.5 line 17732. */
  roleEnum: RoleEnum | null;

  /** Cross-ref: gate MarkupNodeId → entry-point reference. For `<page auth=>` gates,
   *  the entry-point IS the page itself. For `<auth role=>` gates inside a page body,
   *  the entry-point is the enclosing page. For `<channel auth=>` gates, the entry-point
   *  is the file scope (channel placement is file-level per Insight 30 §38.1). */
  gateToEntryPoint: Map<MarkupNodeId, EntryPointId>;

  /** Cross-ref: auth-redirect target. For `<program auth="required" loginRedirect="/login">` and
   *  per-page equivalent, records the redirect target path. A-2.5 reads this to confirm the redirect
   *  target IS its own entry-point per OQ-A2-E (no synthesis). NULL when gate has no redirect.
   *  Per OQ-A2-E ratified S89: A-3 does NOT synthesize a new entry-point for the redirect target;
   *  it merely records the target path for diagnostic + cross-ref purposes. */
  redirectTargets: Map<MarkupNodeId, string | null>;

  /** Diagnostics surface — A-3 raises a small set of structural errors at enumeration time.
   *  Per OQ-A2-I, `W-AUTH-RUNTIME-FALLBACK` is NOT fired here; that fires from A-2.5 (RS).
   *  A-3's diagnostics are catastrophic-only (malformed role-enum decl, multiple role enums, etc.). */
  errors: AuthGraphDiagnostic[];
}

export type MarkupNodeId = number;            // alias of ast.ts:212 MarkupNode.id (Span.ts:19 carries id)
export type EntryPointId = string;            // file-path-anchored; matches A-2's EntryPointId alias
```

### 2.2 Per-gate classification

```typescript
/** Per-gate record. Lives in AuthGraph.gates. */
export interface AuthGate {
  /** Which markup site this gate sits on. */
  siteKind: AuthSiteKind;

  /** Source span (for diagnostics + W-AUTH-RUNTIME-FALLBACK fire-site). */
  span: Span;

  /** AST node id of the gated element (program/page/auth-block/channel node). */
  nodeId: MarkupNodeId;

  /** The role-classification verdict. Either closed-form (per role variant in/out)
   *  OR runtime-fallback (gate-expr is preserved for runtime evaluation by A-4). */
  classification: RoleClassification;

  /** Source-form preserved for diagnostics: the raw attribute value (e.g. "admin" for
   *  `<auth role="admin">`; "required" for `<page auth="required">`). */
  rawPredicate: string;
}

export type AuthSiteKind =
  | "program-auth"        // <program auth="required"> — file-level
  | "page-auth"           // <page auth="required"> — per-page
  | "auth-role-block"     // <auth role="admin">...</> — sub-page component gate
  | "channel-auth";       // <channel auth="required"> — WS upgrade gate

/** Closed-form: A-3.3 statically classified the predicate against the role enum.
 *  Each role variant gets a boolean (IN or OUT). A-2.5 reads gated_for_role to per-role-prune.
 *
 *  Runtime-fallback: A-3.3 could not classify — gate predicate depends on server-fn or
 *  non-closed-form expression. A-2.5 fires W-AUTH-RUNTIME-FALLBACK + admits as worst-case. */
export type RoleClassification =
  | { closed_form: true;  gated_for_role: Set<RoleVariant> }    // role variant set that PASSES the gate
  | { closed_form: false; gate_expr: ExprNode };                // preserved for runtime eval

export type RoleVariant = string;                               // enum variant name; matches §40.1.1 :enum identifier
```

**Note on `gated_for_role` semantics:** the set is the variant set that PASSES the gate (i.e., for `<auth role="admin">`, `gated_for_role = { Admin }`). A-2.5's per-role traversal: if `role ∈ gated_for_role`, the gated component is IN; else OUT. For `closed_form: false`, A-2.5 admits to worst-case (all roles) and fires `W-AUTH-RUNTIME-FALLBACK`.

**Note on `<auth role="admin">` semantics (Q for §40.1.1 reading):** §40.9.9 worked example uses `<auth role="admin">` as a positive predicate — Admin viewer passes. SPEC §40.1.1 line 17150 says "closed-form boolean predicate over the role enum"; single-variant equality (`role == Admin`) is the simplest closed form. A-3.3 must handle: single-variant literal (`role="admin"`), set form (`role="admin,dispatcher"` — comma-separated, OR semantics), negation (`role="!anonymous"` — TBD per §2.5 OQ), boolean-expression form (`role="${admin || dispatcher}"` — TBD per §2.5 OQ).

### 2.3 Role enum

```typescript
export interface RoleEnum {
  /** :enum type name from app-scope declaration. */
  name: string;
  /** Variants in declaration order. Order is the canonical iteration order
   *  (per §40.9.8 determinism preservation). */
  variants: RoleVariant[];
  /** Source span of the :enum declaration (for diagnostics). */
  span: Span;
  /** Anonymous-viewer convention (per §40.9.9 line 17864 + PIPELINE Stage 7.6 line 2380):
   *  if NO role enum is declared AND auth gates are used, RS aborts (deferred wave).
   *  If NO role enum AND NO auth gates, RS treats every entry point as having a single
   *  anonymous viewer role. A-3 surfaces the presence/absence signal via this field;
   *  A-2.5 acts on it. */
  isImplicitAnonymous: boolean;
}
```

### 2.4 Diagnostic surface

```typescript
export interface AuthGraphDiagnostic {
  code: "E-AUTH-GRAPH-001"      // role-enum declared but malformed (e.g., :enum decl without variants)
      | "E-AUTH-GRAPH-002"      // multiple role enums in same compilation unit (§40.9.5 deferred-wave error)
      | "E-AUTH-GRAPH-003"      // <auth role=> references role variant not in enum
      | "E-AUTH-GRAPH-004";     // <auth> block without role= attribute (malformed gate)
  severity: "error" | "warning";
  message: string;
  span: Span;
  filePath: string;
}
```

**Codes E-AUTH-GRAPH-001..004** are structural-malformed diagnostics. Per OQ-A2-I disposition, `W-AUTH-RUNTIME-FALLBACK` is NOT in this list — that fires from RS (A-2.5). Per OQ-A2-F disposition, `E-CLOSURE-002` (no-role-enum-with-auth-gates) also fires from A-2.5. A-3 surfaces information; A-2.5 surfaces diagnostics that depend on the reachability traversal.

### 2.5 Schema OQs (deferred to §6)

1. **`<auth role=>` predicate grammar.** Single-variant only? Comma-separated OR? Negation? Boolean expression (`${a || b}`)? → OQ-A3-A.
2. **Auth-redirect cross-ref shape.** Just the path string? Or resolve to EntryPointId at A-3 time? → OQ-A3-B.
3. **`<page auth=>` inheritance from enclosing `<program>`.** SPEC §40.4 + filesystem-inheritance silent default. Need explicit normative resolution. → OQ-A3-C.
4. **`<channel auth=>` per-role-classification semantics.** Per S80 channel auth accepts only `"required"/"optional"/"none"` — there's no per-role variant in attribute-registry. Does A-3 classify channel gates as binary-only (closed_form: true; gated_for_role = ALL roles when auth="required", EMPTY when auth="none")? → OQ-A3-D.
5. **AuthGraph emission point — compile-time only?** A-2.5 is compile-time. But §40.9.5 line 17726-17728 says runtime-fallback gates have a "runtime check performed at render time" — meaning A-4 must emit runtime code for the runtime-only path. Does AuthGraph need to be emit-time available (codegen consumer beyond A-2.5) or compile-time-only (analysis-only)? → OQ-A3-E.

---

## §3 A-3 sub-phases (decomposition)

### A-3.1 — Auth-site enumerator + `<auth>` element registration (12-20h)

**Scope:** Walk every `FileAST` and enumerate the four auth-site kinds. Produce `AuthGate[]` minus classification (A-3.3 fills classification).

**Tasks:**
- A-3.1.a — Register `<auth>` as a structural element. Add entry to `compiler/src/html-elements.js` REGISTRY (analogous to `<program>` line 517 + `<page>` registration). Add allowed-attrs to `compiler/src/attribute-registry.js` (allowed attrs: `role`, `check`, `else`, `redirect`). Rationale: SPEC §40.9.9 line 17818-17820 references `<auth role="admin">` as if registered, but no compiler-side registration exists today (load-bearing finding §1.5).
- A-3.1.b — `<auth>` parser pass-through: ensure ast-builder.js produces MarkupNode for `<auth>` blocks (with children — `<auth>` has a body per §40.9.9 worked example). No new AST node kind — `<auth>` is `kind: "markup"` like `<page>` / `<channel>`.
- A-3.1.c — Auth-site walker — visit all MarkupNodes; collect into per-file Map<NodeId, AuthSiteKind>:
  - `<program auth=>` (when `fileAST.authConfig.auth != null && != "none"`).
  - `<page auth=>` (any MarkupNode where tag === "page" && attrs has "auth").
  - `<auth>` block (any MarkupNode where tag === "auth").
  - `<channel auth=>` (any ChannelDeclNode where attrs has "auth").
- A-3.1.d — Per-file aggregation: emit `Map<filePath, AuthGate[]>` (minus classification).

**Files:**
- NEW: `compiler/src/types/auth-graph.ts` (the public types per §2).
- NEW: `compiler/src/auth-graph.ts` (the enumerator entry point: `runAuthGraph(files: FileAST[], routeMap: RouteMap): { graph: AuthGraph; errors: AuthGraphDiagnostic[] }`).
- EXTEND: `compiler/src/html-elements.js` (register `<auth>`).
- EXTEND: `compiler/src/attribute-registry.js` (allowed-attrs for `<auth>`).
- (Possibly) EXTEND: `compiler/src/name-resolver.ts` (if `<auth>` needs special `resolvedKind`).

**Tests:** `compiler/tests/unit/auth-graph-site-enumerator.test.ts` (5-8 tests; covers each AuthSiteKind variant + 0-gate file + multi-gate file).

**OQ blockers:** OQ-A3-A (auth predicate grammar) — partially blocks A-3.1.c when walker needs to read the `role=` attr value shape.

---

### A-3.2 — Role enum resolution (4-7h)

**Scope:** Walk `<program>` body + entry-file logic block for the single app-scope `:enum` declaration that constitutes the role enum per §40.1.1. Produce `RoleEnum | null`.

**Tasks:**
- A-3.2.a — Discover role-enum declaration via TypeDeclNode walker. Per §40.1.1 line 17157 the enum SHALL be a single scrml-native `:enum` type. Heuristic candidates: (i) enum named `UserRole` (worked-example convention); (ii) enum referenced by any `<auth role="X">` attribute value (X must be a variant of SOME enum — the enum it references becomes the role enum); (iii) enum declared at `<program>` body scope at app entry file. A-3.2 must commit to a discovery rule — per OQ-A3-F.
- A-3.2.b — Validate single enum (E-AUTH-GRAPH-002 fires on multiple per §40.9.5 line 17732).
- A-3.2.c — Surface `isImplicitAnonymous: true` when no enum found AND no auth gates present.

**Files:**
- EXTEND: `compiler/src/auth-graph.ts` (`resolveRoleEnum(files: FileAST[]): RoleEnum | null` + Map<variantName, RoleVariant>).

**Tests:** `compiler/tests/unit/auth-graph-role-enum.test.ts` (4-6 tests; covers single-enum / multi-enum (E-AUTH-GRAPH-002) / no-enum-no-gates / no-enum-with-gates surface signal).

**OQ blockers:** OQ-A3-F (role-enum discovery rule).

---

### A-3.3 — Per-gate classifier (closed-form vs async) (10-16h)

**Scope:** For each AuthGate produced by A-3.1, classify the gate's predicate as `closed_form: true` (with `gated_for_role` set) or `closed_form: false` (with `gate_expr` preserved). This is the surface that drives `W-AUTH-RUNTIME-FALLBACK` firing in A-2.5.

**Tasks:**
- A-3.3.a — Per-AuthSiteKind classifier:
  - `program-auth` / `page-auth` (attribute value in `"required"`/`"optional"`/`"none"`): always closed-form. `"required"` → gated_for_role = ALL except anonymous; `"optional"` → ALL; `"none"` → ALL. (Per attribute-registry.js:89 + 157.)
  - `auth-role-block` (`<auth role="...">` predicate): per OQ-A3-A grammar disposition. Closed-form if predicate matches grammar; runtime-fallback if predicate is an interpolated expression.
  - `auth-role-block` (`<auth check=...>` form): if check is `await fn()` shape AND fn return type is not a closed-form predicate over role enum → `closed_form: false`. Per §40.9.5 line 17724.
  - `channel-auth`: closed-form binary per attribute-registry.js:191 (only `"required"`/`"optional"`/`"none"` allowed; same logic as program-auth).
- A-3.3.b — Closed-form predicate evaluator. Inputs: predicate string + RoleEnum. Output: `Set<RoleVariant>` (the variants that PASS the gate). Single-variant case: parse role attr value as enum-variant-name; produce {variant}. Comma-separated OR case: union of singletons. Negation/boolean grammar: per OQ-A3-A disposition.
- A-3.3.c — Async/runtime-fallback detector. Inputs: predicate ExprNode. Output: true if predicate references a server-fn (per RI.functions classification) OR a non-closed-form expression (function call to non-stdlib + non-enum-comparison). Cross-ref: META constant-folding primitive (per A-2 OQ-A2-D — same primitive A-2.2.b authors).
- A-3.3.d — Variant-not-in-enum check — fires E-AUTH-GRAPH-003 when `<auth role="X">` and X is not in RoleEnum.variants.

**Files:**
- EXTEND: `compiler/src/auth-graph.ts` (the classifier; ~200-400 LOC).
- POSSIBLE NEW: `compiler/src/auth-predicate-parser.ts` (if predicate grammar warrants a small parser per OQ-A3-A).

**Tests:** `compiler/tests/unit/auth-graph-classifier.test.ts` (8-12 tests; single-variant closed-form; comma-OR closed-form; async-check runtime-fallback; variant-not-in-enum; per-AuthSiteKind variant coverage).

**OQ blockers:** OQ-A3-A (predicate grammar) + OQ-A2-D (constant-folding primitive — shared dep with A-2).

---

### A-3.4 — Auth-redirect → entry-point cross-ref (3-5h)

**Scope:** Per OQ-A2-E ratified S89, A-3 does **NOT** synthesize new entry-points from auth-redirect targets. A-3.4 merely records the `loginRedirect` path string for each gate that has one, producing `redirectTargets: Map<MarkupNodeId, string | null>`.

**Tasks:**
- A-3.4.a — Walk gate set; for each gate with a `loginRedirect=` attr (from `<program loginRedirect=>` or per-page equivalent), record the redirect path string.
- A-3.4.b — Default-redirect handling: per route-inference.ts:2443 the default `loginRedirect = "/login"` when not specified. A-3.4 preserves this default.
- A-3.4.c — Cross-ref to RouteMap.pages: for each redirect path, check whether a page exists at that URL — if not, surface info-level diagnostic (NOT an error per OQ-A2-E disposition; the redirect target is its own entry-point and the absence is the page-author's concern).

**Files:**
- EXTEND: `compiler/src/auth-graph.ts` (`buildRedirectMap(gates, routeMap)` + populate `AuthGraph.redirectTargets`).

**Tests:** `compiler/tests/unit/auth-graph-redirect-crossref.test.ts` (3-5 tests; default-redirect; explicit-redirect; redirect-target-missing-page info diagnostic).

**OQ blockers:** OQ-A3-B (redirect cross-ref shape — string path vs resolved EntryPointId).

---

### A-3.5 — Integration tests + fixture coverage (5-8h)

**Scope:** Wire A-3 into the pipeline orchestration; provide fixture coverage for SPEC §40.9.9 worked example + integration with A-2.5 (stubbed or pending).

**Tasks:**
- A-3.5.a — Pipeline wiring in `compiler/src/api.js` (or wherever orchestration lives): after RI, run `runAuthGraph(files, routeMap)`; surface the result on CompileContext (extend `CompileContext` with `authGraph: AuthGraph | null` per `compiler/src/codegen/context.ts`). Per A-2 SCOPING §4.2 the pipeline becomes: ... → RI → TS → META → DG → BP → **AG (A-3)** → **RS (A-2)** → CG. A-3 sits between BP and RS conceptually; could be earlier if it depends only on RI + TypeRegistry, not DG.
- A-3.5.b — §40.9.9 worked-example fixture replay. Single `.scrml` fixture matching SPEC lines 17800-17839 (the trucking-dispatch-like surface). Assert AuthGraph contents: 1 RoleEnum (UserRole with 4 variants); 4 gates (`<program auth="required">` + `<page auth="required">` + `<auth role="admin">` in Header + `<channel name="presence">` if present); per-role classification matches §40.9.9 lines 17841-17848.
- A-3.5.c — Determinism cross-check — two runs of A-3 on same input produce identical AuthGraph (Set→Array conversion canonical per A-2 SCOPING §7.4).
- A-3.5.d — A-2.5 stub-vs-AuthGraph integration test — A-2.5 fed a manually-constructed AuthGraph fixture produces expected per-role chunk plan.

**Files:**
- NEW: `compiler/tests/fixtures/auth-graph/worked-example-40-9-9.scrml`.
- NEW: `compiler/tests/integration/auth-graph/worked-example.test.ts`.
- NEW: `compiler/tests/integration/auth-graph/determinism.test.ts`.
- EXTEND: `compiler/src/api.js` (pipeline wiring).
- EXTEND: `compiler/src/codegen/context.ts` (add `authGraph` field).

**Tests:** Integration only — unit coverage lives in A-3.1/.2/.3/.4 test files.

**OQ blockers:** OQ-A3-E (emission point — affects whether CompileContext exposure is needed for CG, or only for A-2.5/A-4 internal pass).

---

## §4 Sub-phase estimates + sequencing

| Sub-phase | Hours | Depends on | Parallelizable with |
|---|---|---|---|
| A-3.1 site enumerator | 12-20 | None (consumes FileAST + RouteMap) | — |
| A-3.2 role enum resolution | 4-7 | A-3.1 (for enum-discovery-via-gate-reference heuristic) | A-3.4 |
| A-3.3 classifier | 10-16 | A-3.1 + A-3.2 | — |
| A-3.4 redirect cross-ref | 3-5 | A-3.1 | A-3.2 |
| A-3.5 integration + fixtures | 5-8 | A-3.1 + A-3.2 + A-3.3 + A-3.4 | — |

**Critical path (sequential):** A-3.1 → A-3.2 → A-3.3 → A-3.5 = 31-51h.
**Critical path (with A-3.2 ∥ A-3.4):** A-3.1 → max(A-3.2, A-3.4) → A-3.3 → A-3.5 = 30-49h.

A-3.1 is on the critical path for every downstream phase — its `<auth>` element registration unblocks the entire chain.

**Sequencing relative to A-2:**

- **Can dispatch concurrent with A-2.1–A-2.4** (per A-2 SCOPING §7.1 line 535).
- **Must complete A-3.1 + A-3.2 before A-2.5 dispatch** (A-2.5.a role-enum resolution + A-2.5.b AuthGraph traversal are the consumption integration points per A-2 SCOPING §5 A-2.5 line ~310).
- A-3.3–A-3.5 can land concurrent with A-2.5 if A-2.5 consumes a stubbed RoleClassification surface initially.

---

## §5 Compiler touchpoints

### 5.1 Per-stage impact

| Stage | A-3 impact |
|---|---|
| **BS** (block-splitter) | None — A-3 is post-typer + post-RI. |
| **TAB** (typed AST builder) | Minor — `<auth>` element registration in `html-elements.js` makes TAB recognize the tag as known structural. AST node kind unchanged (`kind: "markup"`). |
| **NR** (name resolver) | Possible — NR may need to stamp `resolvedKind: "scrml-lifecycle"` on `<auth>` nodes (analogous to other scrml-control structural elements). TBD per A-3.1.b implementation. |
| **MOD** (module resolver) | None. |
| **CE** (component expander) | None — `<auth>` blocks contain markup body; CE expands components inside the body normally. |
| **UVB** (unified validation block) | Possible — `<auth>` element registration adds an attribute allowlist; UVB enforces it (`role=`, `check=`, `else=`, `redirect=` per A-3.1.a). No new error code beyond E-AUTH-GRAPH-004 (malformed `<auth>` block). |
| **PA** (protect analyzer) | None — field-level protect is separate per S80 separation. |
| **RI** (route inference) | **A-3 consumes RI output directly** — RouteMap.pages + RouteMap.authMiddleware are the entry-point set + the `<program auth=>` gate set. RI itself unchanged; A-3 layers on top. |
| **TS** (type system) | A-3 consumes TS's TypeDeclNode list to discover the role enum (A-3.2). No TS extension needed. |
| **META** (meta checker + eval) | A-3.3 consumes META's constant-folding primitive per OQ-A2-D (shared dependency with A-2.2.b). |
| **DG** (dependency graph) | None — A-3 is gate-level analysis, not reactive-dep-closure. |
| **BP** (batch planner, Stage 7.5) | None. |
| **AG** (A-3 — NEW stage, 7.55-ish) | **A-3 IS this stage.** New file `compiler/src/auth-graph.ts`. |
| **RS** (A-2 — Stage 7.6) | A-3 produces AuthGraph; RS consumes it (A-2.5.b). |
| **CG** (codegen, Stage 8) | A-3 produces AuthGraph; A-4 consumes it for per-route splitting. A-3 itself does NOT modify CG. |
| **Runtime** | **None.** A-3 is compile-time only. |

### 5.2 Specific files

**NEW files (A-3):**
- `compiler/src/auth-graph.ts` — the enumerator + classifier + redirect-mapper entry point.
- `compiler/src/types/auth-graph.ts` — public types per §2.
- POSSIBLE NEW: `compiler/src/auth-predicate-parser.ts` (if OQ-A3-A grammar disposition warrants a separate parser module).

**EXTENDED files (A-3):**
- `compiler/src/html-elements.js` — register `<auth>` element (A-3.1.a).
- `compiler/src/attribute-registry.js` — allowed-attrs for `<auth>` (A-3.1.a).
- `compiler/src/api.js` — pipeline wiring after RI, before A-2 (A-3.5.a).
- `compiler/src/codegen/context.ts` — extend `CompileContext` with `authGraph: AuthGraph | null` (A-3.5.a).
- POSSIBLE EXTEND: `compiler/src/name-resolver.ts` — stamp resolvedKind on `<auth>` (A-3.1.b — TBD).
- POSSIBLE EXTEND: `compiler/src/ast-builder.js` — if `<auth>` needs special parser handling beyond generic markup (e.g., `role=` attr value shape). TBD per A-3.1.b.

**TEST files (NEW):**
- `compiler/tests/unit/auth-graph-site-enumerator.test.ts` (A-3.1).
- `compiler/tests/unit/auth-graph-role-enum.test.ts` (A-3.2).
- `compiler/tests/unit/auth-graph-classifier.test.ts` (A-3.3).
- `compiler/tests/unit/auth-graph-redirect-crossref.test.ts` (A-3.4).
- `compiler/tests/integration/auth-graph/worked-example.test.ts` (A-3.5).
- `compiler/tests/integration/auth-graph/determinism.test.ts` (A-3.5).
- `compiler/tests/fixtures/auth-graph/worked-example-40-9-9.scrml` (A-3.5).

### 5.3 Pipeline-orchestration position

Per A-2 SCOPING §4.1 post-A-2 pipeline:

```
BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → RS → CG
```

With A-3 added:

```
BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → AG (A-3) → RS (A-2) → CG
```

A-3 sits between BP and RS. Reasoning:
- A-3 consumes RI (RouteMap + authMiddleware) — must be post-RI.
- A-3 consumes TS (TypeRegistry — role-enum discovery via TypeDeclNode) — must be post-TS.
- A-3 consumes META constant-folding primitive (per OQ-A3-A grammar disposition + A-2 OQ-A2-D shared primitive) — must be post-META.
- A-3 does NOT consume DG or BP. So A-3 could in principle dispatch immediately after META.
- A-3 must complete BEFORE RS (A-2.5 consumes AuthGraph). So A-3 lands at any point in [post-META, pre-RS]. Recommendation: after BP for symmetry with RS placement + linear pipeline reading.

---

## §6 Open Questions for PA / user disposition

### OQ-A3-A — `<auth role=>` predicate grammar (BLOCKING — must resolve before A-3.1.c + A-3.3)

**Question:** What predicate grammar does `<auth role="...">` accept? SPEC §40.1.1 line 17150 says "closed-form boolean predicate over the role enum" but does not enumerate the grammar.

**Options:**
- (a) **Single-variant literal only.** `<auth role="admin">` accepts a single enum-variant identifier. Anything else → runtime-fallback (or E-AUTH-GRAPH-004). Simple; matches §40.9.9 worked example verbatim.
- (b) **Single-variant + comma-OR.** `<auth role="admin,dispatcher">` → union of variants. Negation NOT supported.
- (c) **Single-variant + comma-OR + negation prefix.** `<auth role="!anonymous">` → all-except-anonymous. Useful for "any authenticated viewer" pattern.
- (d) **Full interpolation form.** `<auth role="${roleExpr}">` accepts an interpolated expression that the closed-form-predicate evaluator can fold. Maximally expressive; biggest implementation surface.

**Recommendation:** (b) — single-variant + comma-OR. Covers §40.9.9 + "multi-role visible" pattern (e.g., `role="dispatcher,admin"`). Negation can be added in v0.4 (re-evaluate per adopter friction). Interpolation form → falls through to runtime-fallback per §40.9.5 line 17724 (acceptable per current SPEC; the lint surfaces the trade-off).

**Surface for user disposition:** BLOCKING — before A-3.1.c + A-3.3 dispatch.

---

### OQ-A3-B — auth-redirect cross-ref shape (NON-BLOCKING — confirmation)

**Question:** `AuthGraph.redirectTargets` value shape — bare string path (e.g., `"/login"`) or resolved `EntryPointId` (e.g., `"pages/login.scrml::default"`)?

**Options:**
- (a) **Bare string path.** A-3.4 records the raw `loginRedirect=` attr value. A-2.5 / A-4 do their own resolution if needed.
- (b) **Resolved EntryPointId.** A-3.4 looks up the path in RouteMap.pages and emits the canonical EntryPointId.

**Recommendation:** (a) — bare string. Per OQ-A2-E ratified S89: NO entry-point synthesis on auth-redirect; the redirect target's own entry-point exists independently. A-3 just records what the source-text said. Consumer resolution to EntryPointId is a lookup, not synthesis.

**Surface for user disposition:** NON-BLOCKING confirmation.

---

### OQ-A3-C — `<page auth=>` inheritance from enclosing `<program>` (BLOCKING — must resolve before A-3.1.c)

**Question:** Does a `<page>` inside a `<program auth="required">` body inherit `auth="required"` implicitly? SPEC §40.4 (`handle()` interaction) is silent; SPEC §40.8 v0.3 program-shape is silent on attr-inheritance.

**Options:**
- (a) **Implicit inheritance.** Per-page `auth=` not specified → inherits `<program auth=>`. This matches Next.js / Remix middleware-cascade convention.
- (b) **Explicit per-page only.** Each `<page>` must declare its own `auth=` to gate; absence means no gate at the page level. The `<program auth=>` gates the file-level request boundary (matches current route-inference.ts:2433 semantics — authMiddleware is per-file, not per-page-element).
- (c) **Hybrid — program-level is enforced server-side at the request boundary; per-page is a closure-analysis-only gate.** Server-side enforcement: `<program auth=>`. Closure analysis: per-`<page auth=>`.

**Recommendation:** (b) — explicit per-page only, but add `W-AUTH-PAGE-INFERRED` info-lint when a `<page>` lacks explicit `auth=` AND the enclosing `<program auth=>` is `"required"`. Rationale: current route-inference.ts:2433 implements (b) — `authMiddleware` is per-file. Changing to (a) would require RI rework + per-page authMiddleware. (b) is the smaller deferred-cost path. A v0.4 amendment can promote to (a) if adopter friction emerges.

**Surface for user disposition:** BLOCKING — affects A-3.1.c walker logic + A-3.3 per-page classification.

---

### OQ-A3-D — `<channel auth=>` per-role classification semantics (NON-BLOCKING — confirmation)

**Question:** `<channel auth=>` only accepts `"required"/"optional"/"none"` per attribute-registry.js:191. There's no per-role grammar at the channel-auth level today. Does A-3 classify channel gates as binary (closed_form: true; gated_for_role = ALL non-anonymous when "required", ALL when "optional"/"none") or does A-3 fold channel-auth into a different surface?

**Recommendation:** Channel-auth is binary per current spec; A-3 classifies as closed_form: true with gated_for_role = `{ all variants except anonymous }` when `auth="required"`, all variants when `auth="optional"`/`"none"`. Per-role channel-auth grammar is deferred per §40.9.5 line 17732 (multi-role enum deferred-wave). Per-channel role-predicate is a v0.4+ amendment item.

**Surface for user disposition:** NON-BLOCKING confirmation.

---

### OQ-A3-E — AuthGraph emission point (BLOCKING — must resolve before A-3.5.a)

**Question:** Is AuthGraph compile-time only (analysis input to A-2.5) or also runtime-emit-time (CG must emit auth gates for the runtime-fallback path per §40.9.5 line 17726-17728)?

**Options:**
- (a) **Compile-time only.** A-3 emits AuthGraph for A-2.5 consumption; A-2.5 emits `ReachabilityRecord` for A-4 consumption; A-4 reads ReachabilityRecord and emits runtime auth-check JS for the runtime-fallback path. AuthGraph itself is not exposed beyond A-2.5.
- (b) **Compile-time + emit-time.** AuthGraph is exposed on CompileContext for A-4 + CG consumption. A-4 reads AuthGraph directly for the runtime-fallback emission path (rather than going through ReachabilityRecord).

**Recommendation:** (a) — compile-time only. Per A-2 SCOPING §4 lines 195-197, A-2 produces ReachabilityRecord on CompileContext; A-4 consumes it. AuthGraph is A-2.5's input; once A-2.5 has produced its per-role chunk plan, the runtime-fallback path is encoded in the chunk plan (per §40.9.5 line 17726 "treated as runtime-only ... shipped eagerly"). A-4 reads ChunkPlan and emits accordingly; it does not need AuthGraph independently.

**Surface for user disposition:** BLOCKING — affects A-3.5.a CompileContext extension surface.

---

### OQ-A3-F — Role-enum discovery rule (BLOCKING — must resolve before A-3.2.a)

**Question:** How does A-3.2 discover the app-scope role enum per §40.1.1? SPEC §40.1.1 line 17157 says "single scrml-native `:enum` type declared at app scope" but doesn't fix a discovery rule.

**Options:**
- (a) **By name convention.** Name must be `UserRole` (the worked-example convention). Brittle; not in normative SPEC.
- (b) **By reference.** The enum referenced by `<auth role="X">` (X resolves to enum-variant) is the role enum. Requires A-3.1 to complete first. Multiple enums referenced → E-AUTH-GRAPH-002.
- (c) **By app-entry-file `<program>` body scope.** The single `:enum` declared inside the entry file's `<program>` body is the role enum. Determined by filesystem (entry file) + scope (program body).
- (d) **By explicit declaration.** Adopter declares via `<program role-enum="UserRole">` attribute. New attribute surface; cleanest at the cost of new SPEC text.

**Recommendation:** (b) + (c) **dual rule with reconciliation.** Discover via reference (b); if multiple enums referenced, fall back to entry-file-`<program>`-body scope (c); if still ambiguous, fire E-AUTH-GRAPH-002. Rationale: (b) is the empirical signal (what does the code USE as role); (c) is the structural signal (what does the entry file DECLARE as app-scope). Combining both catches most real shapes without requiring (d)'s new SPEC text.

**Surface for user disposition:** BLOCKING — before A-3.2.a dispatch.

---

### 6.7 Summary — blocking + non-blocking surface

**BLOCKING — must resolve before A-3 dispatch:**
- OQ-A3-A (predicate grammar; recommend (b) single-variant + comma-OR).
- OQ-A3-C (page-auth inheritance; recommend (b) explicit per-page only + W-AUTH-PAGE-INFERRED).
- OQ-A3-E (emission point; recommend (a) compile-time only).
- OQ-A3-F (role-enum discovery; recommend (b) + (c) dual rule).

**NON-BLOCKING — confirmation:**
- OQ-A3-B (redirect cross-ref shape; recommend (a) bare string).
- OQ-A3-D (channel-auth per-role; recommend binary closed-form).

**Cross-cutting with A-2 OQs:**
- OQ-A2-D (constant-folding primitive) — A-3.3 needs the same primitive A-2.2.b authors. A-3 should NOT independently author this; consume A-2.2.b output.
- OQ-A2-E (auth-redirect entry-point synthesis) — ratified S89; A-3 records redirect target as path-string, no synthesis. Captured in A-3.4 scope verbatim.
- OQ-A2-F (`E-CLOSURE-002` for no-role-enum + auth-gates) — fired from A-2.5 per OQ-A2-I disposition. A-3 surfaces the signal via `RoleEnum.isImplicitAnonymous` + presence of auth gates.
- OQ-A2-I (`W-AUTH-RUNTIME-FALLBACK` fire-site) — fires from A-2.5 (RS). A-3 carries `closed_form: false` + gate_expr; A-2.5 fires on consumption.

### 6.8 SPEC-silent areas list (summary)

1. `<auth>` element registration in html-elements.js / attribute-registry.js (load-bearing §1.5 finding).
2. `<auth role=>` predicate grammar (OQ-A3-A).
3. `<page auth=>` inheritance from `<program auth=>` (OQ-A3-C).
4. AuthGraph emission point — compile-only vs CG-exposed (OQ-A3-E).
5. Role-enum discovery rule (OQ-A3-F).
6. `<channel auth=>` per-role grammar (OQ-A3-D; deferred per §40.9.5 line 17732).

### 6.9 Algorithm-choice surface — ONE OPTION or MULTIPLE VIABLE?

**Verdict:** The AuthGraph schema (§2) is ONE OPTION — pinned by A-2 SCOPING §7.1's expected shape (`Map<MarkupNodeId, RoleClassification>`). Sub-implementation alternatives (multiple viable) live in:
- OQ-A3-A predicate grammar.
- OQ-A3-C page-auth inheritance.
- OQ-A3-F role-enum discovery.

Per pa.md Rule 3 ("the right answer beats the easy answer"), all six OQs surface their full option-space here for user adjudication rather than auto-collapsing to recommendations.

---

## §7 Total estimate

### 7.1 Per-sub-phase hour estimates (sequential)

| Sub-phase | Hours | Cumulative |
|---|---|---|
| A-3.1 site enumerator + `<auth>` element registration | 12-20 | 12-20 |
| A-3.2 role enum resolution | 4-7 | 16-27 |
| A-3.3 per-gate classifier | 10-16 | 26-43 |
| A-3.4 redirect cross-ref | 3-5 | 29-48 |
| A-3.5 integration + fixtures | 5-8 | 34-56 |

### 7.2 Critical-path estimate (with A-3.2 ∥ A-3.4)

A-3.1 → max(A-3.2, A-3.4) → A-3.3 → A-3.5 = **30-49h critical path** at parallel cadence.

### 7.3 Grand total

**34-56h sequential / 30-49h critical-path with parallel A-3.2 ∥ A-3.4.**

Per Insight 29 architect estimate cited in PIPELINE Stage 7.6 line 2336: "§40 auth-graph integration ~40-120h". This SCOPING's 34-56h sits at the low end of that band — consistent with A-3 being scoped narrowly to AuthGraph derivation (not the broader §40-codegen integration the Insight 29 estimate may have included).

### 7.4 Confidence

- A-3.1 12-20h: HIGH confidence on lower bound (mostly walker + registration); ~30% upside if `<auth>` element registration triggers downstream regression cascade (NR/UVB/CE integration tests).
- A-3.3 10-16h: MEDIUM confidence — depends on OQ-A3-A disposition. (b) single-variant + comma-OR is 10-12h; (d) full interpolation would be 20-30h.
- A-3.5 5-8h: HIGH confidence — fixture authoring + integration test plumbing is well-understood from prior dispatches.

---

## §8 Map content consulted

Per pa.md maps-discipline protocol:

- `.claude/maps/primary.map.md` (full) — confirmed map routing for "new language feature implementation" task-shape: domain.map → schema.map → error.map → test.map.
- `.claude/maps/domain.map.md` (full) — confirmed pipeline stage sequencing + S87/S88 context (Insight 30 channel-architecture precedent for `<channel>` placement; `<page>` element precedent for new structural element registration).
- `.claude/maps/schema.map.md` (full) — confirmed AuthConfig at `ast.ts:1321` is `<program auth=>` only; ChannelDeclNode interface at `ast.ts:1152` is the precedent shape for new structural-element interfaces; MarkupNode at `ast.ts:212` is the existing carrier for `auth`/`loginRedirect` attrs (already declared there).

**Load-bearing findings:**

1. **§1.5 finding (highest load):** `<auth>` block element per SPEC §40.9.9 worked example has no compiler-side registration in `html-elements.js` or `attribute-registry.js`. A-3.1.a must register it (~precedent: `<page>` Wave 2 S85; `<channel>` S87 Insight 30). This is the largest single piece of net-new infrastructure in A-3.

2. **§1.6 finding (sequencing):** A-2 OQ-A2-D (constant-folding primitive extraction from META) is a SHARED dependency between A-2.2.b and A-3.3. A-3 should NOT independently author this primitive; A-3.3 consumes A-2.2.b's output. If A-2.2.b is deferred or stubbed, A-3.3 stub falls back to "treat all gate_expr as closed_form: false → runtime-fallback".

3. **§1.5 + §6 OQ-A3-C finding:** `<page auth=>` inheritance from enclosing `<program auth=>` is SPEC-silent. Current route-inference.ts:2433 implements per-file `authMiddleware` map (file-level only, not per-page-element). This means A-3 must commit to explicit-per-page-only semantics (option (b)) without breaking RI's current behavior, OR escalate RI to per-page authMiddleware (option (a) — larger surface).

4. **§5.3 finding:** A-3 pipeline-position is post-META, pre-RS. Could land post-META or post-DG/BP; recommendation post-BP for symmetry with A-2.

5. **OQ-A2-E ratification (per dispatch brief, S89):** A-3 does NOT synthesize new entry-points from auth-redirect targets. A-3.4 records redirect target as bare string path; A-2.5 / A-4 resolve to existing entry-points as needed via RouteMap.pages lookup.

**Maps consulted but not load-bearing:** primary.map.md File Routing table (no surprises); domain.map.md Business Invariants (none touched by A-3).

---

## §9 Cross-references

- A-2 SCOPING: `docs/changes/a2-reachability-solver-scoping/SCOPING.md` (consumer contract at §5 A-2.5 line ~306 + §7.1 line ~528).
- A-1 closeout: `docs/changes/a1-closeout/` (substrate basis; 523-edge ceiling).
- Approach A master SCOPING: `docs/changes/v0.3-approach-a-impl/SCOPING.md`.
- SPEC §40.1.1: Static role classification for closure analysis (lines 17146-17163).
- SPEC §40.9.5: Component 4 normative statement (lines 17708-17734).
- SPEC §40.9.9: Worked example with `<auth role="admin">` block (lines 17800-17864).
- SPEC §40.9.11: Error codes E-CLOSURE-001 + W-AUTH-RUNTIME-FALLBACK (lines 17881-17888).
- PIPELINE Stage 7.6 (Reachability Solver) input contract: lines 2340-2348 (cites four AuthGraph source sites).
- Insight 29: `scrml-support/design-insights.md` line 1827 — Approach A ratification.
- S87 Insight 30: channel-architecture precedent for new structural-element registration (`scrml-support/design-insights.md`).
- master-list.md: lines 9-11 — Approach A wave A-1 close + v0.3 deferral reversal user-ratification context.

---

## §10 Disposition checklist before A-3.1 dispatch

PA / user disposition needed on:

- [ ] OQ-A3-A predicate grammar (BLOCKING; recommend (b) single-variant + comma-OR).
- [ ] OQ-A3-C page-auth inheritance (BLOCKING; recommend (b) explicit per-page + W-AUTH-PAGE-INFERRED).
- [ ] OQ-A3-E emission point (BLOCKING; recommend (a) compile-time only).
- [ ] OQ-A3-F role-enum discovery (BLOCKING; recommend (b)+(c) dual rule).
- [ ] OQ-A3-B redirect cross-ref shape (NON-BLOCKING; recommend (a) bare string).
- [ ] OQ-A3-D channel-auth per-role (NON-BLOCKING; recommend binary closed-form).
- [ ] Pipeline-position confirmation: post-BP, pre-RS (recommended in §5.3).
- [ ] `<auth>` element registration scope: structural + attr-allowlist only, no special CE/NR handling (recommended in §5.2).

Once these are dispositioned, A-3.1 can dispatch as the first concrete sub-phase. A-3 can run concurrent with A-2.1–A-2.4; A-3.1 + A-3.2 must complete before A-2.5 dispatches.
