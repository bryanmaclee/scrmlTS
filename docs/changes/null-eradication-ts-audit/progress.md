# Progress: S89 null eradication TS audit (compiler/src)

## 2026-05-13T00:00:00Z
- Startup verification passed. Worktree clean, bun install + pretest OK.
- Read primary.map.md + structure.map.md.
- Next: exhaustive grep of `\bnull\b` in compiler/src/ excluding tests + module-resolver.js + meta-checker.js.

## 2026-05-13T00:05:00Z
- Total hits: 2777 across 81 files (after excluding module-resolver.js + meta-checker.{js,ts}).
- Pattern counts: 473 comparison sites, 412 return-null, 665 TS-type-union `| null`, 55 string-literal "null".
- Top hotspots: type-system.ts(291), ast-builder.js(236), symbol-table.ts(192), emit-logic.ts(165), emit-engine.ts(139), emit-control-flow.ts(105), runtime-template.js(99), rewrite.ts(99).
- Audit shape: per-file bucketed (not per-line) due to volume; semantic-mirror candidates enumerated as migration items.

## 2026-05-13T00:35:00Z
- Audit doc written: docs/audits/null-audit-compiler-src-2026-05-13.md.
- Sections: §1 methodology, §2 per-file findings (organized A-G), §3 summary metrics (~720 M / ~480 J / ~1500 I / ~80 AMBIGUOUS), §4 migration backlog (M-7C-D-1..18), §5 AMBIGUOUS (10 PA disposition items), §6 high-priority recommendations (dispatch order), §7 what was not audited.
- Load-bearing finding: scrml `not` keyword → JS literal `null` in compiled output is the canonical scrml-semantic-mirror cascade — emit-expr.ts L296-298 + rewrite.ts L739 + server-fn wire format + SQL absence + engine state cells. Migration requires runtime absence-sentinel as prerequisite (M-7C-D-12).
- Next: commit single audit doc + progress.

