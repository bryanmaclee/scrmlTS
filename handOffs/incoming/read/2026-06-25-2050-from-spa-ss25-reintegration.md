---
from: spa-ss25
to: scrml (PA)
date: 2026-06-25
subject: ss25 (ast-builder parse/diagnostics) — 1 fix landed; 2 verify-then-close (stale gaps); 1 native twin → ss28
needs: action
status: unread
---

sPA ss25 (legacy ast-builder parse + diagnostics) ran autonomously. **1 real fix
LANDED**; **2 of 3 items were already-fixed on cf9f1109** (NOT-REPRODUCED →
verify-then-close). Did NOT advance main / did NOT push.

## Branch
- **Branch:** `spa/ss25` · **tip:** `61d7b64a` · **base:** origin/main `cf9f1109`. 0-behind / 2-ahead, clean.
- Dev-agent based on cf9f1109; file-delta base-verified clean.

## Items
| # | item | disposition | commit |
|---|------|-------------|--------|
| 1 | g-control-flow-in-markup-lift-body-evades-diagnostic | **RESOLVED — verify-then-close (NOT-REPRODUCED)** | 989ba81c |
| 2 | g-inline-struct-return-type-misparse | **LANDED** (the only real fix) | 61d7b64a |
| 3 | bug-75 after-`>` engine `:`-shorthand | **RESOLVED — verify-then-close (NOT-REPRODUCED)** ⚠ user-ruled | 989ba81c |

### #1 — NOT-REPRODUCED (already fixed)
R26 across 7 shapes (if/for-of × bare-cell/predicate × `</>`/`</p>` closers × preceding-markup-sibling × multi-statement lift body): ALL fire `E-CONTROL-FLOW-IN-MARKUP`; raw `lift` never ships; bare `lift` in markup also compiles clean. The gate (ast-builder.js ~L1697 `BARE_CONTROL_FLOW_IN_MARKUP_RE` on a text block) matches any `if/for/while(...){` body regardless of `lift` content. The S214/ss15 claim is stale (the `:1518` line in the gap is also stale → real gate ~L1697). known-gaps.md → resolved. No code change.

### #2 — LANDED (legacy ast-builder, NOT block-splitter, NOT native)
`fn f() -> { active: int, … } { return … }` misparsed: parseLogicBody's return-type-token loop broke at the FIRST depth-0 `{` (the inline-struct TYPE opener) → real body dangled, `return active;` standalone → E-SCOPE-001. Fix: braceDepth + type-position heuristic (depth-0 `{` opens a struct TYPE when a type-atom is expected — start or after `| & , ( < [` — else body), across all 8 return-type loops. Named/no-return-type byte-preserved. Verify: agent 25229/0 + adversarial 13/13 + browser/TodoMVC; sPA R26 repro errors=[] (was E-SCOPE-001).
- ⚠ **WITHIN-NODE ALLOWLIST RE-BASELINE — INCREASE** (`samples/login.scrml` MISSING-FIELD 52→59, single targeted entry, same-land per the conformance rule). This is NOT a canary loosening: the legacy fix made login.scrml parse the inline-struct-return fields CORRECTLY, surfacing genuine divergence vs the still-buggy NATIVE parser. Justified.
- ⚠ **NATIVE TWIN → ss28 (NEW residual, cross-ingestion):** the NATIVE parser has the SAME inline-struct-return bug (returnTypeAnnotation=undefined + body→2 bare-exprs for login.scrml). Deferred per the brief's STOP-if-native rule. **When ss28 fixes native, the login.scrml MISSING-FIELD allowlist entry should drop back toward 52** — flag for the ss28 list + the eventual native fix.

### #3 bug-75 — NOT-REPRODUCED (already fixed) ⚠ USER-RULED, CONFIRM CLOSE
R26: the after-`>` ENGINE `:`-shorthand now WARN-COMPILES (`W-COLON-SHORTHAND-LEGACY-PLACEMENT` fires, errors=[]) — NOT the hard-fail `E-STRUCTURAL-ELEMENT-MISPLACED` the gap described. Byte-identity vs inside-opener verified: client.js byte-identical; static HTML identical modulo filename (both `<div data-scrml-engine-mount="phase">idle text</div>`); the `:`-body renders. The **S177 user KEEP-OPEN condition (keep open UNTIL it warn-compiles byte-identical) is MET.** known-gaps.md → resolved, BUT this is a user-ruled gap — **recommend close pending your/user confirm.**

## Pattern note — corpus ran ahead (consistent across the S221 rebuild)
2 of 3 ss25 items + ss27 #1 (bug-19) + some ss19 gaps were already-fixed on current HEAD. The S221 list rebuild captured stale claims; R26 verify-before-claim (reverse: NOT-REPRODUCED) caught each — no wasted re-fix dispatches. Worth a list-currency pass before future sweeps.

## Environment
Same recurring full-suite flake/variance under concurrent load (agent saw 2-flaky-fails-don't-reproduce); committed gates 0-fail. ≤2-agent concurrency kept.

## Close
End-state: #2 landed · #1 + #3 verify-then-close (resolved in known-gaps) · native twin → ss28. Branch + `spa-lists/ss25.progress.md` + this message are the handoff. The user closes the instance.
