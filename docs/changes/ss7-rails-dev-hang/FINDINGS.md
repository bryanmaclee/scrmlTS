# FINDINGS — ss7 item 2: g-mount-hang-rails-dev → RECLASSIFIED native-parser non-termination

**By:** sPA ss7 (S211) · **Disposition:** parked → PA (re-cluster into ss4, re-prioritize)

## TL;DR
The list framed this as a *runtime happy-dom mount hang* (0% CPU, blocked await). **Wrong on both
axes.** R26 reproduction: the **compile** infinite-loops at **100% CPU** in the **meta-eval re-parse**
path and never reaches mount. The loop is inside the **native parser** (`nativeParseFile`), so it is
**ss4** (native-parser) territory, not ss7 (meta-checker/render-harness). And it is a **robustness-class
bug** — a parser that fails to terminate on malformed input can hang the whole compiler — not the
"low urgency stress-sample" the list assumed.

## Reproduction (reliable)
```
cd <repo>
timeout 60 bun run compiler/src/cli.js compile samples/gauntlet-r18/rails-dev.scrml -o /tmp/x/
# → exit 124 (timeout-killed); /usr/bin/time -v shows 100% CPU for the full 60s, 0 output files.
```
`rails-dev.scrml` is a pure compile-time `^{}` sample: `reflect()` two structs, then nested
`emit()` loops generate a CRUD UI as scrml markup. There is **no runtime state/effect** — so a "mount
hang" was never plausible; the cost is entirely at compile time.

## Mechanism
1. `^{}` meta-eval runs `emit(...)`, producing scrml source.
2. That emitted source is **re-parsed** at the "ME" stage by `compiler/src/meta-eval.ts:350
   reparseEmitted()` → `:380 nativeParseFile("__meta_emit__", normalized)` (M6.1/S122 native-parser
   migration of the meta-emit re-parse path).
3. `reparseEmitted` itself has **no loop** — it is a thin wrapper. The non-termination is **inside
   `nativeParseFile`** (the native parser / lexer / assembler under `compiler/native-parser/`) on the
   specific malformed markup the full sample emits.

The emitted markup IS malformed (the sample uses scrml's `/`-shorthand closer in ways that leave
tags unterminated — e.g. `<h2>Product Management/` does not close the `<h2>`). That is fine — the
parser SHOULD reject malformed input with a clean diagnostic. It does for simpler cases; it loops on
this one.

## Bisection (8 reduced reproducers — all ERROR cleanly, none hang)
All of the following hit `E-META-EVAL-002` ("Re-parsing emitted meta code failed: …") and terminate
with exit 1 — i.e. the parser handles them correctly:
| repro | shape | result |
|-------|-------|--------|
| A | struct + reflect + single `emit` (unterminated `<p>`) | error (Unterminated tag `<p>`) |
| B | `fields.forEach` single-level emit | error (Unterminated `<label>`) |
| C | 1 model + section/h2 + conditional-input fields.forEach | error (closer `</section>` vs `<h2>`) |
| D | full table/thead/tbody/tr/td block | error (Unterminated `<tr>`) |
| G | full sample minus the Customer model (Product only) | error (6 errors) |
| H | 2 iterations each emitting `<section>…<h2>…/…</section>` | error (4 errors) |
| I | create-form block (cond input + nested `<label class=checkbox>`) × 2 | error (11 errors) |
| J | same create-form block × 1 | error (6 errors) |

**Only the full `rails-dev.scrml` (both models, all blocks) loops.** The minimal looping repro is
elusive — it requires the full sample's specific *accumulation* of malformed blocks across both
`models.forEach` iterations. Single blocks/sections, and even 2× repetitions of individual blocks,
all error cleanly. So the non-terminating path is a *combination*-sensitive error-recovery defect in
the native parser, not any single construct.

## Fix target (for the ss4 / native-parser dev-agent)
Root-cause the non-terminating path in `nativeParseFile` (lexer/parser/assembler under
`compiler/native-parser/`) reached from the meta-emit re-parse. The parser MUST make forward progress
on every token and terminate with a clean `E-`/`W-` diagnostic on malformed input — never loop.
Suggested approach: instrument `nativeParseFile` on the full repro to find the token/position where
the cursor stops advancing (classic no-forward-progress loop in an error-recovery branch); add the
missing advance/bailout. Verify: full repro terminates with `E-META-EVAL-002` (like the reduced
cases) AND the full native-parser conformance suite stays green (predicate-drift / feature-stale
mirror hazards apply — S115/S162).

## Why parked (not sPA-fixed)
Cross-ingestion: ss7's shared ingestion is meta-checker.ts + render-harness; the loch is the native
parser (ss4 coreFiles). The contract escalate-triggers "mis-clustered / footprint wrong /
blast-radius exceeds shared-ingestion" all apply. A native-parser termination fix also needs
native-parser expertise + heavy conformance verification, and the native parser is mid-migration —
exactly the class the contract wants surfaced to the PA, not silently cross-cluster-fixed.
