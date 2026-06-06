# scrmlTS — Session 167 (CLOSE)

**Date:** 2026-06-06
**Previous:** `handOffs/hand-off-171.md` (= S166 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-172.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; default A). Ultracode ON.

## 🏁 S167 CLOSE — JS-host-boundary DD + value-native `map` type FULLY designed & debate-ratified + HIGH deep-set Bug A landed / Bug B filed · `wrap and push`

A DESIGN-HEAVY foundation session that also closed the open HIGH. The user directed `run the JS-host-boundary deep-dive and high bug` → PA ran the S166-queued JS-host DD (member-class reframe), landed HIGH Bug A + filed Bug B, then drove the value-native `map` type design **one fork at a time** (per `feedback_no_batch_ratify_foundational_axioms`) culminating in an **adversarial debate** the user requested → grafted hybrid ratified. `wrap and push`.

---

## SYNC / REPO STATE AT CLOSE
- **scrmlTS:** HEAD `75431e9e` (Bug A) + the wrap commits (this wrap: docs + maps). **PUSHED this wrap** (authorized).
- **scrml-support:** JS-host DD + map-surface debate + user-voice S167 — committed + pushed this wrap.
- **Version:** on v0.7.0 (no cut — design + one native-adjacent parser fix; default output unchanged; no tag, no cross-repo notice).
- **Tests:** full suite **23,075 pass / 0 fail / 220 skip / 1 todo / 914 files** (at Bug A landing `75431e9e`; no source changed since — only docs/maps). within-node **1005/0** (+4 r11-elixir-chat native-lag allowlist bump, correct-shadow).
- **known-gaps:** **HIGH 1** (Bug B — new; Bug A closed the original's parser layer) · MED 9 · LOW 16. + the JS-host scalar-gap (no value-native parseInt/Math.round/Date.now — a queued sub-thread, not yet a filed bug).
- **Maps:** refreshed to `75431e9e` (wrap step 6c — incremental; 4 maps: test/structure/primary/domain; project-mapper clean, no crash). `dependencies/schema/config/build/error` retain prior watermarks (genuinely unchanged).
- **Worktrees:** main only (the Bug A dispatch worktree `agent-a53e5e892b211dfe0` cleaned at wrap).
- **Inbox:** empty. No outbound notices due (design-only; the map is unbuilt — no giti/6nz/scrml/master notice).

## ★ THE VALUE-NATIVE `map` TYPE — FULLY RATIFIED (the session's headline deliverable)
Ratified design consolidated → **`docs/changes/map-type-2026-06-06/RATIFIED-DESIGN.md`** (the SPEC-draft input — READ IT for the next arc). The locks:

| # | Decision |
|---|---|
| Surface | **bracket-native** ("map = array keyed by values"); `[KeyT: ValT]` concrete affix (no generics); `[:]` empty; `[k:v]` literal |
| Keys | **any §45-comparable** (primitives + structs + enums; function-containing excluded via `E-EQ-003`); struct keys "just work" (structural ==) |
| Key-hash | the EXISTING **§47 canonical-string codec** (hash-consistency `(=x y)⇒(=hash x hash y)` free from §45 — the validated keystone) |
| READ | **bracket** `@m[k] → V|not` (allocation-free, composes with given/is some); `.getOr(k, default)`; `.has(k) → bool` |
| WRITE/REMOVE | **method-native** `.insert`/`.remove`/`.update`/`.insertAll` (reassignment-canonical, visible cost, composes) |
| Delete | **`.remove()` — NOT `=not`** (kills the capability-hole; `[K:V|not]` stores `not` via `.insert(k, not)`, removes via `.remove(k)`, distinguishes via `.has(k)`) |
| Iteration | `.keys()/.values()/.entries()` → value-native arrays; **UNORDERED by default + LOUD** + `.sorted()` stabilizer + costed opt-in `@ordered` affix |
| `==` | structural, **order-independent** (§45) — even for `@ordered` maps |
| Serialization | lossless codec (raw JS Map rejected — JSON.stringify drops it) |

**v1 scope-cuts (decide-on-purpose):** map-as-key NOT in v1 (any §45-comparable EXCEPT another map; unordered keeps the door open); struct-key literals via `.insert` (primitive-key literal `["DAL": 4500]` ships).

**SHIP-GATE (hard prereq):** the **S166 cycles-forbid barrier** (reject-on-cycle at cell-assignment + route `@arr[i]=x` bracket-write through COW) + a **seen-set guard in `_scrml_structural_eq`** (runtime-template.js:2491 — a cyclic struct key would stack-overflow the hash). The "acyclic keys guaranteed" precondition is FALSE today. The broken-bracket-write prereq DISSOLVED (method-write reassigns a named cell, sidestepping the bracket-target codegen).

**Provenance:** JS-host DD `scrml-support/docs/deep-dives/js-host-boundary-2026-06-06.md` (the capability warrant) → user forks 1+2 → debate `scrml-support/docs/debates/map-surface-bracket-vs-method-2026-06-06.md` (Swift bracket-native vs Gleam/Roc method-native, refereed by Clojure; grafted hybrid **53/60**) → user rulings (write-surface=hybrid, order=unordered-loud). Design insight recorded `~/.claude/design-insights.md`.

## THE JS-HOST-BOUNDARY DD (the unifying foundation — in-progress)
`scrml-support/docs/deep-dives/js-host-boundary-2026-06-06.md` (status in-progress). 5-stream research workflow `wf_0bee34f1-1fb` + PA spot-check. **The reframe:** "hide the host" is NOT a binary — Appendix-D's ~50 members partition into 3 classes: **A leak-bearing** (`structuredClone`/`Weak*`/`Reflect`/`Proxy`/raw Map/Set → hide; contradict §45.6/cycles) · **B pure-value-ops** (`Math`/`JSON`/`parseInt` → no semantic leak; hiding = free corpus-pedagogy choice, NOT a necessity) · **C IO** (`setTimeout`/`Promise`/`console` → already hidden 2-of-3 contexts). **Empirical (PA-verified):** adopter host-REFERENCE-type usage is ZERO across 947 `.scrml`; only a thin SCALAR cluster leaks (~80% in `23-trucking-dispatch`). **The REAL unaddressed adopter friction = the scalar gap** (no value-native `parseInt`/`Math.round`/`Date.now` — `scrml:time`/`format`/`data` cover formatting+shape, not primitive coercion/arithmetic). scrml already owns the typed-escape door (`import:host` §21.3.1 / `extern` §23.3.3). PA corrected its own "1-of-3 holdout" framing (false-symmetry — only A/C members are the holdout, not the value-ops). Map = the genuine capability gap → build (this session's map arc).

## BUGS (S167)
- **Bug A (parser) — RESOLVED `75431e9e`.** Multi-statement deep-set/array-mutation write-loss: `collectExpr`'s depth-0 boundary check gated on `peek(1)`∈{`=`,`+=`,`:`}, but a deep-set's `peek(1)` is `.`, so the preceding statement's RHS swallowed it → a deep-set/array-mutation survived only as the FIRST statement of a function body. 51-line `ast-builder.js` fix; codegen untouched; +16 emit-shape +4 happy-dom. Fixed a LIVE `@messages.push(msg)` drop in `samples/gauntlet-r11-elixir-chat`.
- **Bug B (codegen) — NEW HIGH, OPEN.** `docs/changes/high-deepset-write-loss-2026-06-06/BUG-B-structural-compound-deepset-mistarget.md`. On a structural-compound cell (`<a><ref></>`), `a` lowers to a DERIVED composite, so `@a.ref = x` targets `a` (clobbered by recompute) not the leaf `a.ref`; fails at runtime even for a single deep-set. Fix locus `emit-logic.ts:3003` (retarget the write to the backing leaf cell for the path; the symbol-table knows the structural-compound→leaf mapping). **Net HIGH stays 1** (Bug B replaces the original open HIGH).
- (native, swap-arc-tracked) native parser folds `@obj.path=`/`@arr.method()` in function bodies to bare-expr — same class as Bug A, a native swap-grind parity item.

## OPEN QUESTIONS / NEXT-PRIORITY (S168)
1. **The map BUILD arc** (Profile-B-shaped — the design is landed, `RATIFIED-DESIGN.md` carries the context-sweep): **(a) the cycles-prereq FIRST** (S166 cycles barrier + the `_scrml_structural_eq` seen-set guard — the hard ship-gate), then **(b) the map SPEC §** (grammar/literal/access/method-surface/key-hash/iteration/codec/E-codes), then **(c) the build decomposition** (type-system → parser → runtime → codegen; Set follows decoupled; the 130 self-host sites ride the P3 bridge).
2. **Bug B fix** — structural-compound deep-set mistarget (HIGH; contained codegen-retarget; dispatchable anytime).
3. **The JS-host scalar-gap** — the real adopter friction (value-native `parseInt`/`Math.round`/`Date.now`?). A queued JS-host sub-thread (a `scrml:math`? coercion operators? a monotonic-clock primitive?). Possibly higher day-to-day adopter value than the rest of the JS-host arc.
4. **The remaining JS-host member-class dispositions** — class-A leak-bearing hide (structuredClone/Weak*/Reflect/Proxy/Error-subclass), Appendix-D tightening (decision (b)), the object/method vocab scrub (decision (e)). Each its own one-axis-at-a-time deliberation (DD is the substrate).
5. **Set** — decoupled (rides on map if built [map-keyed-to-self] OR `scrml:data` helpers). The thinner S166 warrant.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter. Profile A/B. `full wrap` / 88% floor. **wrap step 6c maps refresh** (S166; executed this wrap — incremental, project-mapper clean).
- Dispatch discipline: S88 isolation explicit · F4 startup-verify · S112 merge-startup · S99/S126 Bash-edit + no-`cd` (S100 hook) · S136 BRIEF.md archival · S138 R26 / PA-independent dual-verify EVERY landing · S147 branch-leak coherence. `--no-verify` forbidden (pre-commit AND pre-push, Config B).
- **S164 background-commit-race:** wait for the completion notification before reading HEAD/coherence (held this session — Bug A commit + maps both run-in-background, waited).
- **No batch-ratify of foundational axioms** (S166 memory) — held cleanly this session (forks one-at-a-time; user chose to DEBATE the surface rather than rubber-stamp). Standing-autonomy session-scoped (none durable).

## Tags
#session-167 #profile-a-full-start #js-host-boundary-member-class-frame #map-type-ratified #bracket-read-method-write #unordered-loud #grafted-hybrid-53-60 #high-bug-a-landed #high-bug-b-filed #cycles-prereq #scalar-gap-queued #wrapped #pushed
