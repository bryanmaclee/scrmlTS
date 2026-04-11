# Progress: lin-batch-c-step1

- [start] Pre-snapshot recorded — 234 unit pass, 3 integration fail (pre-existing), branch not yet created
- [step 1] Branch created: changes/lin-batch-c-step1
- [step 2] Removed dead linNodes field from FileAST interface (type-system.ts line 299)
- [step 3] Swapped TS-G to use allLinNodes from fileAST.nodes (first attempt — still wrong shape)
- [step 4] Investigated: discovered fileAST.nodes is undefined; nodes are at fileAST.ast.nodes (CE wrapper shape)
- [step 5] Applied dual-shape fallback (same pattern as buildOverloadRegistry line 4060): fileAST.nodes ?? fileAST.ast?.nodes ?? []
- [step 6] Unit tests confirmed: 234 pass, 0 regressions after all edits
- [step 7] Commit 3913241: initial linNodes → allLinNodes swap + dead field removal
- [step 8] Commit 70e5388: dual-shape fallback for fileAST.ast.nodes
- [blocked] Integration tests NOT written: discovered ast-builder.js never emits lin-decl or lin-ref nodes
           lin keyword in logic blocks → tilde-decl; variable refs → strings in init/expr fields
           checkLinear is keyed on lin-decl/lin-ref exclusively; E2E tests would all fail
           Deeper gap is out of single-concern scope — stop and report
- [step 9] Commit a4d3487: anomaly report documenting the deeper gap
- [done] Branch changes/lin-batch-c-step1 is clean, 3 commits ahead of main
