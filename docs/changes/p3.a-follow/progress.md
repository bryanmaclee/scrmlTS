# Progress: p3.a-follow

- [12:35] Started — branch `changes/p3.a-follow` created off P3.A merge `00c533a`.
- [12:36] Worktree bootstrap: `bun install` (root + compiler) + `bash scripts/compile-test-samples.sh`.
- [12:38] Pre-snapshot baseline confirmed: 8539 pass / 40 skip / 0 fail (matches dispatch).
- [12:39] Channel inventory complete: 5 distinct `name=` values across 12 pages.
- [12:50] dispatch-board channel migrated. Pure-channel-file `channels/dispatch-board.scrml` created. 5 pages updated (board, load-new, load-detail in dispatch/; quote in customer/; load-detail in driver/). 8541 pass / 40 skip / 0 fail. +2 vs baseline (new file picked up by expr-node-corpus-invariant audit; 0 escape hatches).
- [12:55] customer-events channel migrated. Pure-channel-file `channels/customer-events.scrml` created. 5 pages updated (customer/home, customer/loads, customer/invoices, dispatch/billing, driver/load-detail). 8543 pass / 40 skip / 0 fail. +2 vs prior commit (new file picked up by expr-node-corpus-invariant audit; 0 escape hatches).
