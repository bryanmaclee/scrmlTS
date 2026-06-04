# F1 (native engine arm-body parse) — Phase-0 SURVEY findings

**Date:** S163, 2026-06-04. **HEAD:** `c3303adc`. **Agent:** general-purpose (read-only, opus, agentId `a71decf0cde5f6128`). **Method:** per-file corpus compile under `--parser=scrml-native` vs default; 35 corpus engine files (46 `<engine`-bearing `.scrml` minus 11 native-parser self-host mirrors).

## Headline: F1 is far narrower than the "~168 mixed" framing

**24 of 35 corpus engine files compile CLEAN under native.** Of the 11 fails, only **4 are genuinely engine-arm-body**; 7 carry an `<engine>` but fail in OTHER flip-families (F3/F4/F5/F6) and are mis-attributed to F1. The full-flip "~168" is test-assertion fan-out over a handful of files + mis-attribution — NOT broad engine-arm parse breakage.

## Bucket breakdown (the 11 native-fails)

| File | Native fatal | Bucket | Note |
|---|---|---|---|
| `repro-2-boot-effect.scrml` | E-UNQUOTED (`Loading...`) | **A** | bare display text in engine arm; §4.18.7-correct |
| `repro-ab2.scrml` | E-UNQUOTED (`Ready:`) | **A** | bare display text in engine arm; §4.18.7-correct |
| `engine-message-dispatch-s6.scrml` | E-UNQUOTED ×2 on `\| .Pat :> tgt` | **B (B2)** | native has NO §51.0.S message-arm parser |
| `14-mario-state-machine.scrml` | E-SCOPE-001 (`reset`) | **B (B1)** | native lexer doesn't reserve `reset` builtin |
| `25-triage-board.scrml` | E-EXPR-UNEXPECTED + E-SCOPE-001 | **B (B1) / C** | `reset` scope bug + assign-in-expr (F3/F5) |
| `hos.scrml` | E-STMT-* / E-EXPR / E-SCOPE-001 | **C** | stmt/expr grammar (F5/F6), not engine-arm |
| `loads.scrml` | E-TYPE-063 (enum `(none)`) | **C** | enum-decl dropped upstream; not engine-arm |
| `04b-tier2-engine.scrml` | E-EXPR-UNCLOSED + E-TYPE-063 | **C** | match-as-expr multi-stmt `lift` arms (F3) |
| `05-signup-form.scrml` | E-CTX-001 + E-EXPR-UNCLOSED-BRACE | **C** | `<form>` markup-closer family (F4) |
| `06-failable.scrml` | E-CTX-001 + E-EXPR-UNCLOSED-BRACE | **C** | same form-markup family (F4) |
| `admin.scrml` | E-MARKUP-002 + E-CTX-001 | **C** | `<signup>`/`<program>` closer mismatch (F4) |

**Counts:** (A) §4.18-enforcement = **2** · (B) real native bug = **2 files / 2 distinct shapes** (+`25-triage` partial-B) · (C) other family = **7**.

## Bucket (A) — §4.18 enforcement (USER-RULING fork)

Bare display text in an engine state-child arm body → `E-UNQUOTED-DISPLAY-TEXT` (fatal), native only. **Spec-correct per §4.18.7** (code-default body; bare run = code; display text must be `"..."`). **Live fires E-UNQUOTED ZERO times corpus-wide** — §4.18.7 was wired ONLY in the native parser (`parse-markup.js` MK3.3 + `display-text-literal.js`); the live pipeline never wired it ("queued, spec-ahead"). Total asymmetry: native strict, live silent.

Migration shape: `<Loading>Loading...</>` → `<Loading>"Loading..."</>`. Verified: quoted form compiles clean under native (incl. each-in-arm). This is the **exact F8 precedent shape** (native strict + spec-correct → corpus migrates; native does NOT relax).

**The fork:**
- **(a)** Migrate corpus to quoted form AND wire §4.18.7 into the live pipeline too → asymmetry closes permanently, both pipelines enforce. Larger (new live fire site).
- **(b)** Migrate corpus to quoted form, leave live lenient → corpus native-clean; live keeps tolerating bare text until M6 deletes the live pipeline anyway. Smaller; matches the "live is doomed, native is canonical enforcer" strategic line. **[survey + PA recommend (b)]**

## Bucket (B) — real native bugs (PA-fixable)

**B1 — `reset` (+ `req`/`cleanup`/`upload`/`replay`/`transition`) builtins not reserved by the native lexer.** Live `tokenizer.ts:78` reserves these as KEYWORD tokens; the live expr-parser builds `reset(...)` as a `ResetExpr` node the E-SCOPE-001 walker never visits as a bare ident. Native (`lex-in-code.js`/`token.js`) doesn't recognize them → emits `reset(@coins)` as an ordinary CallExpr with Identifier callee `reset` → type-system fires E-SCOPE-001. Not in `LOGIC_SCOPE_GLOBAL_ALLOWLIST` either.
- **Locus:** `compiler/native-parser/lex-in-code.js` + `token.js` (keyword set) + the native expr-translation that builds the call node.
- **Size:** SMALL/localized. Lowest-touch: add scrml builtins to `LOGIC_SCOPE_GLOBAL_ALLOWLIST` (shape-consistent with how `replay`/`transition`/`broadcast` are already handled). Or mirror `tokenizer.ts:78` keyword reservation + build the ResetExpr-equivalent.
- **Coupling:** independent of B2. Affects mario + triage-board (+ any `reset`/builtin user under native).

**B2 — native has no §51.0.S message-dispatch arm parser.** `<engine accepts=Msg>` with `| .Pattern :> target` message arms (S155 / §51.0.S; live `parseMessageArms`). Native has no message-arm recognizer → arm falls to MK3.3 `emitCodeDefaultRun` → fails M2 expr parse → spurious E-UNQUOTED.
- **Locus:** `parse-state-body.js` (needs an `accepts=`/message-arm branch) + `parse-markup.js` MK3.3 (`dispatchCodeDefaultBody`/`emitCodeDefaultRun` ~1058-1212, recognize `| pat :> tgt` before treating as prose).
- **Size:** L-sized (missing parser feature; mirrors live `engine-statechild-parser.ts parseMessageArms()`).
- **Coupling:** independent of B1. Affects `engine-message-dispatch-s6` + any `accepts=` engine.

## R26 correction to PA recon

PA recon reported mario `E-SCOPE-001 ×2 + E-SELF-WRITE-DETECTED ×4 + E-SHADOW ×2`. The `E-SELF-WRITE-DETECTED` / `E-SHADOW` were **grep artifacts** (loose `E-[A-Z0-9-]+` matched the trailing-E substrings of `W-ENGINE-SELF-WRITE-DETECTED` and `I-PARSER-NATIVE-SHADOW`). Mario's only real fatal on `c3303adc` is **1 E-SCOPE-001** (on `reset`); the 2 self-writes are INFO (`W-ENGINE-SELF-WRITE-DETECTED`, correct per §51.0.F.1). Self-write handling is already spec-correct — NOT a bug.

## Recommendation + order

1. **§4.18.7 ruling FIRST** (escalate to user — gates bucket-A; ~5-min decision). Recommend fork **(b)**. Surface (a) since the user may want the asymmetry closed permanently.
2. **Bucket-B fixes, B1 before B2.** B1 small/high-value/independent (clears mario + part of triage-board); B2 the L-sized message-arm parser (the only genuine large native-arm item).
3. **Re-scope C out of F1** — 7 files belong to F3/F4/F5/F6 dispatches, not F1.

**Honest signal:** the true engine-arm native surface is **2 enforcement-asymmetry (ruling) + 2 bugs (1 small, 1 L)**, against **24 engine files already native-clean**. F1 is much narrower than "~168 mixed." This implies the F2-F9 per-family fail counts (assertion-level) are similarly inflated relative to file-level fix scope — relevant to swap-grind pacing + v0.8 placement.
