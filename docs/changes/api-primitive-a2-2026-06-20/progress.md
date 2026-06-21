# A2 W2 — parser recognition of `<api>` — progress

(append-only, timestamped)

## 2026-06-20 — startup
- pwd: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a0761f89e7066e52a
- startup verification PASS: toplevel==pwd, tree clean, merge main "already up to date",
  bun install OK, bun run pretest OK (13 test samples compiled).
- SPEC §60 verified present (line 32898). Read §60.1-§60.11 in full.
- SCOPE doc read: W2 = parser recognition of `<api>` element + endpoint sub-decls +
  parse-level `E-API-*` diagnostics. NO codegen, NO server/HTML emission.
- Maps: primary.map.md Task-Shape Routing (parser/new-feature) → ast-builder.js +
  block-splitter.js, model on `<db>`/`<schema>`/`match-block`.

## Findings (empirical probes)
- BS already produces `type=markup name=api` with FULL `<api>...</api>` text in
  block.raw (closer included). Body lines (endpoint decls) are non-tag, so the
  compound-scan does NOT misclassify. No BS change strictly needed.
- emit-html.ts emitNode: unrecognized node kinds fall through emitting NOTHING
  (ends at ~:2328). So a NEW `api-decl` node emits no HTML by default.
- type-system.ts ~:10741: "Unknown node kinds — conservatively asIs, no error."
  So an `api-decl` node will not choke TS.
- Plan: dispatch `block.name === "api"` in ast-builder `case "markup"` (mirror
  match-block); parse opener attrs (base= req, src= opt); slice body raw; parse
  endpoint lines per §60.2 grammar; fire E-API-BASE-MISSING / -METHOD-INVALID /
  -RESPONSE-TYPE-UNDECLARED / -ENDPOINT-MALFORMED at parse time. Build kind:"api-decl".

## 2026-06-20 — implementation
- ast-builder.js: added `block.name === "api"` dispatch in `case "markup"`
  (mirrors match-block / each-block). Brace-aware opener-end finder; parse
  base= (req) + src= (opt) string attrs; slice body raw; parse endpoint lines
  per §60.2 grammar (ENDPOINT_RE full + ENDPOINT_PREFIX_RE head-only). Builds
  `kind: "api-decl"` { base, src, endpoints:[{name,reqShape,method,path,
  responseType,span}] }. Per-line spans computed by newline-counting in apiRaw.
  Committed 8880f699.
- Diagnostics (parse-time, push TABError into errors[]):
  E-API-BASE-MISSING (opener, no base=), E-API-METHOD-INVALID (method not in
  GET/POST/PUT/PATCH/DELETE), E-API-RESPONSE-TYPE-UNDECLARED (head matches
  prefix but no `: ResponseT`; RECOVERS with responseType=null), and the NEW
  E-API-ENDPOINT-MALFORMED (catch-all body line). All four exit-1; valid → exit-0.
- SPEC: §34 +4 E-API-* rows; §60.9 marked the 4 as "wired S210 W2" + added
  E-API-ENDPOINT-MALFORMED; planned codes (UNKNOWN/REQ-SHAPE-MISMATCH/PATH-
  PARAM-UNBOUND/A1-SRC) kept as planned (W3/W4). Committed (SPEC commit).
- Unit test compiler/tests/unit/api-decl-parser.test.js — 20 tests / 58 expects:
  AST shape (base/src/endpoints, verbatim path templates, per-line spans),
  optional src=, optional req-shape, the 4 diagnostics each (+ result.errors
  partition cross-check), comment/blank-line skip, no-emission contract.

## DEFERRED to W3 (NOT implemented this wave)
- E-API-ENDPOINT-UNKNOWN, E-API-REQ-SHAPE-MISMATCH, E-API-PATH-PARAM-UNBOUND
  (need §53/§14 type resolution + path-param↔reqShape binding).
- The `<request api=>` consumption mode (W4).
- reqShape / responseType are captured as RAW type-ref text — NOT resolved.
