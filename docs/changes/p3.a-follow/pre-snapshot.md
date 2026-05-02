# Pre-snapshot — p3.a-follow

**Recorded:** 2026-05-02
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a692492972b80f528/`
**Branch:** `changes/p3.a-follow` (off main tip `00c533a` — P3.A merge)

## Test baseline

`bun test compiler/tests/` (after `bash scripts/compile-test-samples.sh`):

```
 8539 pass
 40 skip
 0 fail
 29706 expect() calls
Ran 8579 tests across 424 files.
```

Matches dispatch baseline exactly. Earlier run showed 2 ECONNREFUSED failures from a
puppeteer/network test — those are flaky and pre-existing, unrelated to channel work.

## Worktree bootstrap (one-time)

Worktree was created without `node_modules`. To produce reproducible test runs:

```
cd compiler && bun install        # acorn, astring, happy-dom
cd .. && bun install              # puppeteer, vscode-languageserver
bash scripts/compile-test-samples.sh   # populate samples/compilation-tests/dist/
```

After bootstrap, `bun test compiler/tests/` yields the 8539-pass baseline.

## Channel inventory (raw)

`grep -rn "<channel" examples/23-trucking-dispatch/ --include='*.scrml'`:

15 channel-decl markup hits across 12 pages. Five distinct `name=` values.

## Files in scope

- `examples/23-trucking-dispatch/pages/customer/loads.scrml`
- `examples/23-trucking-dispatch/pages/customer/home.scrml`
- `examples/23-trucking-dispatch/pages/customer/invoices.scrml`
- `examples/23-trucking-dispatch/pages/customer/load-detail.scrml`
- `examples/23-trucking-dispatch/pages/customer/quote.scrml`
- `examples/23-trucking-dispatch/pages/dispatch/board.scrml`
- `examples/23-trucking-dispatch/pages/dispatch/billing.scrml`
- `examples/23-trucking-dispatch/pages/dispatch/load-new.scrml`
- `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml`
- `examples/23-trucking-dispatch/pages/driver/home.scrml`
- `examples/23-trucking-dispatch/pages/driver/messages.scrml`
- `examples/23-trucking-dispatch/pages/driver/load-detail.scrml`

## Files to be created

- `examples/23-trucking-dispatch/channels/dispatch-board.scrml`
- `examples/23-trucking-dispatch/channels/customer-events.scrml`
- `examples/23-trucking-dispatch/channels/load-events.scrml`
- `examples/23-trucking-dispatch/channels/driver-events.scrml`

(One file per topic. Single-page channels stay per-page per migration plan.)

## Tags

#snapshot #p3.a-follow #channel-migration #baseline

## Links

- Spec: `compiler/SPEC.md` §38.12 (cross-file channel inline-expansion)
- FRICTION: `examples/23-trucking-dispatch/FRICTION.md` §F-CHANNEL-003
- Kickstarter: `docs/articles/llm-kickstarter-v1-2026-04-25.md` §7 (channel recipe)
- Canonical example: `examples/15-channel-chat.scrml`
