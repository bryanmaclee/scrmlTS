# Article truthfulness fix pass — progress

Append-only. Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a0df7bee89be75530

## 2026-05-21

- Startup verified. WORKTREE_ROOT confirmed; `git merge main --no-edit` fast-forwarded to 80d5dc13; status clean.
- Read audit matrix in full + retraction article.
- SPEC verification for mutability-contracts (task-mandated):
  - Claim A `transitions {}` enum block — REJECTED: SPEC §51.2 defines it verbatim (`.Variant => .Variant`). Article matches SPEC.
  - Claim B `<machine>` deprecated → `<engine>` — CONFIRMED (PRIMER 243, 572).
  - Claim C `(not -> string)` typestate — REJECTED as "spec-divergent": SPEC §14.3 shows `passwordHash: (not -> string)` as canonical. Implementation incomplete but article banner already discloses that.
  - Claim D `lin` — `lin` IS SPEC §35 ratified, unimplemented; article banner already marks it preview.
  - Claim E `[order_amount]` brand — CONFIRMED gone: zero SPEC/PRIMER hits.
  - Claim F `@amount: T` decl form — minor: non-canonical reactive decl shape vs PRIMER structural form.
  - VERDICT: 3 of 5 REWRITE-justifying claims rejected. mutability-contracts reclassified REWRITE -> FIX-WITH-ANNOTATION. No destructive narrowing — SPEC confirms almost nothing is gone. Apply narrow fixes only.

## 2026-05-21 — applied

- article 1 why-programming-for-the-browser: lin + WASM/sidecar correction notes. commit 6c41fd35.
- article 2 components-are-states: machine->engine x2, Living-Compiler link, de-version banner. commit 102192e7.
- article 3 server-boundary-disappears: async framing reword, de-version, Living-Compiler link. commit a6e6f9a7.
- article 4 npm-myth: sealed-language vendor note, Living-Compiler link, citation fix. commit 853dc364.
- article 5 orm-trap: section cite, transaction-workaround correction, Living-Compiler link. commit 5e0dfe56.
- article 6 css-without-build-step: Tailwind gap-list correction (verified SPEC 26.3/26.4 shipped), Living-Compiler link. commit fe34b42f.
- article 7 lsp-and-giti-advantages: Living-Compiler link-scrub only (reclassified ACCURATE->FIX). commit 815071fe.
- article 9 realtime-and-workers: residual @shared scrub, de-version x2, Living-Compiler link. commit 8e667a5b.
- article 10 tier-ladder-promotion: match block-form correction (verified S108/S109 landing), de-version banner, quoted-text forward-note. commit 84c0e914.
- article 12 scrml-debate-amends-zod-claim: L22 roadmap correction (formFor/schemaFor shipped, serialize stashed), quoted-text forward-note. commit 2da8dec4.
- article 8 mutability-contracts: REWRITE -> FIX-WITH-ANNOTATION after SPEC verification. Applied: de-version banner, [order_amount] brand removed (confirmed gone), @amount: decl form -> canonical structural <amount gt(0) lt(10000)> = 0, machine->engine x3, Living-Compiler link. NOT cut: transitions {} (SPEC 51.2), (not -> T) typestate (SPEC 14.3), lin (SPEC 35) — article's own status banner already honestly discloses typestate+lin unimplemented.
