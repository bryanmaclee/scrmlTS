# dPA queue — banked deliberation requests

**The dPA drains this on a batch run** (`read dpa.md and boot`, rooted in `flogence/`). The PA writes
items here while warm; the dPA reads them, runs each, flips `status: banked → complete` with the
artifact path + a one-line conclusion, and drops a `(dpa: …)` breadcrumb in `delta-log.md`. The dPA
**NEVER** flips an item to `ratified` — that is the PA's act (RUN-not-RATIFY, `dpa-scrml.md` §3).

Item format + drain protocol: `scrml-support/dpa-scrml.md` + the design DD
`scrml-support/docs/deep-dives/dpa-deliberation-satellite-2026-06-18.md` (§6 worked example).

---

## [dpa-001] debate — External-backend boundary: typed-external-API primitive (A) vs docs-only (B) vs stay-full-stack (C)
status: complete      # banked → running → complete → ratified(by PA)  ·  dPA-complete S210 2026-06-20, ADVISORY — PA ratifies
banked: S210 2026-06-20
output-path: scrml-support/docs/debates/external-backend-A-vs-B-vs-C-2026-06-20.md
source-DD: scrml-support/docs/deep-dives/external-backend-frontend-only-2026-06-20.md (§Recommendation-for-Debate)

### Scope-lock (COMPLETE framing — lifted from the source DD §Recommendation-for-Debate)
Question: Should scrml ship a **first-class typed external-API primitive** to court the bring-your-own-backend
  (BYOB) segment (A), **document the already-working client-only path and nothing more** (B), or **refuse the
  segment** to keep the disappearing-boundary identity laser-sharp (C) — and where does the on-ramp-vs-dilution
  axis land? (BYOB = a scrml frontend over an existing external Rust/Go/etc. backend.)
In scope: the A-vs-B-vs-C fork + the philosophy axis (does a typed external boundary contradict scrml's
  "no API layer to drift out of sync" identity?).
Out of scope: **D (hybrid — docs now, primitive gated on signal) is the likely SYNTHESIS, NOT a starting pole**
  — let the judge land there; do not seed it. **A1 (OpenAPI ingest) is eliminated as the FIRST move** — heaviest
  surface; OQ-4 says the response-typing half is already covered → if A ever ships, A2 (declared-shape,
  contract-in-source) is the co-location-honest start. **C-as-"refuse-to-document" is dominated** (the mode
  exists regardless; no synthesized persona favored it) — debate C as the deliberate-identity-focus stance, not
  as document-refusal.
Already-known (the converged core, PA-verified S209 — do NOT re-litigate): client-only-over-an-external-backend
  WORKS today (raw `fetch()` is NOT a §12.2 server-trigger → pure client SPA; `<request>`/`<poll>` + `parseVariant`
  §41.13 are the primitives). The gap: no first-class `<api>` primitive typing an external HTTP endpoint the way
  `<db>` types SQL; the flagship disappearing-server-boundary is given up in this mode. **SSR-of-external-data is
  structurally GAPPED** (no scrml server to prerender on; getting it back = a scrml BFF/proxy tier, which
  re-introduces a server and contradicts the BYOB premise — A/B/D all inherit this).

### Load-bearing scrml CONSTRAINTS (verbatim — prevents scope_blindness)
- IDENTITY (README L5, verbatim): scrml's pitch is **"no API layer to drift out of sync"** — an `<api>` primitive
  RE-INTRODUCES exactly the API layer the identity disowns. This is the philosophy axis the debate turns on.
- CO-LOCATION axiom (user-voice S206, verbatim): "if a thing does a thing, I want to look at the thing and know
  what it does" — A2 (contract-in-source) satisfies this; A1 (external snapshot schema) is weaker.
- OQ-4 (the response-typing question): `parseVariant` (§41.13) + §53 refinement types may ALREADY cover the
  response-typing need, leaving only **request/endpoint** typing as the genuine gap — so a primitive's net-new
  surface may be just the typed-callable/endpoint half, not "a whole `<db>` analog."
- LIMIT-PRIMITIVES (S174, verbatim): "limit primitives, don't god-ify them" — weigh whether a new `<api>` surface
  is a sharper primitive or a god-object beside `<db>`/`?{}`.
- POINTER: the full converged core + the prior-art table (TanStack / Orval / openapi-ts / tRPC [same-language-only]
  / Relay+GraphQL / HTMX / Elm-ports / SvelteKit-load / Phoenix-LiveView) is in the source DD §Context + §Prior-Art.
- CAVEAT (carry into the debate framing): the source DD's dev-agent signal was **SYNTHESIZED, not polled**
  (dispatch was denied in that env) — OQ-2 (segment size: "the BYOB segment is the majority of realistic adopters")
  is **un-quantified**. The case for *gating* A (vs shipping it) rests on a number nobody has measured. RUN A REAL
  DEV-AGENT POLL alongside the debate (the 8 personas in the source DD §Dev-Agent-Signal) to close OQ-2.

### Approaches
- **A** — first-class typed external-API primitive (the `<api>` direction; A2 declared-shape preferred over A1 OpenAPI-ingest).
- **B** — docs-only (document the client-only `<request>`/`parseVariant` path + a recipe; ship nothing new).
- **C** — stay-full-stack / deliberate-identity-focus (the LiveView bet; forgo the BYOB cohort to keep the boundary sharp).
- (Judge may synthesize **D** — docs now, primitive gated on a measured BYOB signal.)

### Expert / forge list
- **Pro-A:** `react-trpc-subscriptions-expert` (in store → stage) — "everything crossing a boundary must be typed."
  **FORGE `openapi-codegen-expert`** (Orval / openapi-typescript / @hey-api — the literal A1/A2 prior art; the PA
  pre-forged this at bank-time S210 → `flogence/.claude/agents/openapi-codegen-expert.md`). `fsharp-type-providers-expert`
  (in store → stage) for the "compiler as read-only observer" discipline.
- **Pro-B / backend-agnostic on-ramp:** `htmx-hypermedia-expert` (in store → stage; backend-agnosticism as strength,
  low-ceremony) + `elm-architecture-expert` (EXISTS; typed boundary via explicit decode — scrml already has `parseVariant`).
- **Pro-C / disappearing-boundary purist:** `elm-architecture-expert` or a full-stack-purist voice + the Phoenix-LiveView
  stance; `simplicity-defender` (in store → stage) for the "are we sure we want a second data story?" check.
- **Real dev-agent poll** of the 8 BYOB personas (source DD §Dev-Agent-Signal) to close OQ-2 — run alongside.

### Report-back
one-line verdict + scorecard path → flip this item to `status: complete` + append the verdict here + a staged
design-insight CANDIDATE (`authority: dPA-produced, awaiting PA+user ratification`) + a `(dpa: complete → <path> ·
verdict: <one-line>)` breadcrumb in `scrml/handOffs/delta-log.md`. Do NOT ratify.

### Verdict (dPA, S210 2026-06-20 — ADVISORY, NOT ratified)
**Artifact:** `scrml-support/docs/debates/external-backend-A-vs-B-vs-C-2026-06-20.md`
**One-line:** Ship **A2** (a thin, declared-shape `<api>` typing the request/endpoint half) on top of **B's documentation
philosophy** — **A1** (OpenAPI ingest) gated to first-party + CI-enforced contracts; **D's "gate on signal" condition
COLLAPSED** because the REAL 8-persona poll MEASURED the signal (BYOB ≈ 75% of realistic adopters — unanimous it's the
majority cohort; fork 7/8 toward a typed form); **C dominated** to a single surviving discipline constraint (the primitive
must NOT lie about what it verifies — encode the owned-vs-unowned-boundary epistemic difference at the declaration site).
**Scorecard:** B 45.5 / A 43 / C 40 (B narrow on points; synthesis + measured adoption risk break the tie toward A2-thin).
**Pipeline:** 6 experts live-dispatched (3 poles) + REAL 8-persona dev-poll (closes OQ-2) + neutral debate-judge.
**Staged design-insight CANDIDATE** (in the artifact §Design Insight): encode owned (`<db>`) vs unowned (`<api>`) boundary
typing as a type-system-visible distinction so the compiler never lies about what it guarantees. NOT landed in
`design-insights.md` (PA's act). **Poll fidelity caveat:** prompt surfaced the "drift" tension → fork-vote may skew to A
(size number ~75% is the solid takeaway); a debiased re-poll is the one follow-up that would harden "ship now". **PA action
requested** (4 items) in the artifact footer. RUN-not-RATIFY: the dPA did NOT ratify, edit SPEC, or land the insight.

---

## Candidate (NOT yet banked — PA/user to decide whether to fold into dpa-001 or bank separately)
- **flogence raw-route ask** (`scrml/handOffs/incoming/read/...from-flogence-fsp-raw-route-requirements.md`) — the
  SERVE-side of the same typed-HTTP-boundary axis as dpa-001 (dpa-001 = scrml *consuming* a foreign backend;
  raw-route = scrml *serving* a raw wire to foreign clients). Same "first-class typed HTTP boundary vs stay-implicit"
  philosophy axis. Candidate to fold into dpa-001's framing or bank as dpa-002. Not banked pending the user's call.
