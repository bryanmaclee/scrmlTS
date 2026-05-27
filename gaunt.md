# gaunt.md — gauntlet runner (fresh-Claude entry point)

**You are a FRESH Claude instance in the scrmlTS repo. You have just been told
"read gaunt.md."** You are the **gauntlet runner** — an orchestrator that
spawns dev-agent personas in parallel, overseers their output, and writes a
round report.

**DO NOT execute the scrmlTS PA session-start protocol** (no pa.md read, no
hand-off rotation, no spec-index read, no master-list read, no user-voice
read, no inbox check, no maps refresh). That protocol is for the project's
primary agent. You are a gauntlet-runner — a different role with a narrow
scope.

**DO read these (in order) to know what to do:**

1. This file (`gaunt.md`) — your runbook.
2. The current round's `BRIEF.md` — the shared dev brief. Path under
   §"Round identity" below. You will reference its path in dispatch prompts;
   you do NOT need to read it in full yourself (the devs read it). You SHOULD
   skim its top section so you understand what the round is testing.

That's it. ~2 reads.

**Prior-round context (recoverable in 30 sec if you need it):**
- Most recent completed round + findings: `scrml-support/docs/gauntlets/gauntlet-r{N}-report.md` (look at the latest sibling of `gauntlet-r{N}/` dirs).
- R24 (2026-05-27) closed with canon-clear health YELLOW-drifting-RED + 8 compiler-bug candidates filed into `scrmlTS/docs/known-gaps.md` Bugs 28-34 + R24-BUG-4 cross-ref.

---

## Round identity

**Active round:** R25 (Help-Desk Ticketing was R24 — done; R25's task is in the BRIEF.md at the path below.)

- **Round number:** R25
- **Date initiated:** date the report from the current real-world date
- **Purpose:** see the BRIEF.md ("Round purpose" section at the top)
- **Personas:** see the BRIEF.md ("Personas" section); default scrml-dev-{react,go,svelte,pascal} unless BRIEF.md overrides
- **Dispatch shape:** N devs in PARALLEL (single message, N Agent calls),
  then N overseers in PARALLEL after all devs complete
- **Output dir:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/`
- **Report file:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25-report.md`
- **BRIEF.md:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/BRIEF.md`

If the BRIEF.md path above doesn't exist, STOP and tell the user PA hasn't
authored the R25 brief yet — runner can't proceed without it.

---

## Step 1 — Verify environment

Run these checks (one Bash batch). If anything fails, STOP and report to user:

```bash
cd /home/bryan-maclee/scrmlMaster/scrmlTS
pwd
ls -la .claude/agents/scrml-dev-{react,elixir,svelte,pascal}.md
ls /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/BRIEF.md
ls /home/bryan-maclee/scrmlMaster/scrmlTS/docs/articles/llm-kickstarter-v2-2026-05-04.md
ls /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md
bun --version
mkdir -p /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/dist
```

**Persona swap from R24:** Go → Elixir. The new persona is `scrml-dev-elixir` (Phoenix / OTP / channels-native mental model — the right foil for testing the channel + SSE + multi-user surface R25 introduces).

All persona files for the round must exist (check whatever personas the BRIEF.md
names). BRIEF.md must exist. Both required-read files must exist. `bun` must
be available.

**Also verify persona auto-resolution at YOUR session start.** Claude Code's
harness caches `.claude/agents/` definitions when a session opens. The personas
the BRIEF.md names MUST appear in your available-agents list. If they don't, the
personas were added AFTER your session started — STOP and tell the user to
restart their Claude session in this directory. The gauntlet cannot proceed
without persona resolution.

You can verify by trying a 1-shot resolution ping (no work, just check the
agent type resolves) BEFORE the full N-dev parallel dispatch. If
`subagent_type: "scrml-dev-react"` returns "Agent type not found," you have
the stale-session problem.

---

## Step 2 — Dispatch N devs in PARALLEL (one message, N Agent calls)

**CRITICAL:** put all N Agent calls in a SINGLE message so they run concurrently.
Use `run_in_background: true` on each so they don't block. Do NOT use
`isolation: "worktree"`.

**CRITICAL DISPATCH-SHAPE CHANGE (S136 / R24-meta-finding):** background
sub-agents may lack Write permission to the `scrml-support/` tree under the
current allow-list. R24 saw 3 of 4 devs fail Write to the brief's mandated
path. The runner is now the **single point of disk authority** for the final
.scrml output:

- **Devs iterate against `/tmp/`** for compile testing (filesystem-permissive).
- **Devs RETURN their final scrml content in the result message**, wrapped in
  unambiguous markers.
- **Runner extracts the content** between markers and writes the final file
  to the canonical path (`scrml-support/docs/gauntlets/gauntlet-r25/dev-<N>-<persona>.scrml`).
- This sequence is independent of allow-list state on the dev side.

The dispatch prompt for each dev is the same shape — only the persona-specific
fields change:

```
You are dev-<N>-<persona> in gauntlet R25.

Your single shared assignment brief is at:
  /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/BRIEF.md

Read it IN FULL. Then read the required-reads it lists IN FULL, IN ORDER:
  1. /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md
  2. /home/bryan-maclee/scrmlMaster/scrmlTS/docs/articles/llm-kickstarter-v2-2026-05-04.md
  3. /home/bryan-maclee/scrmlMaster/scrmlTS/docs/PA-SCRML-PRIMER.md (sections the BRIEF.md identifies)

DISPATCH-SHAPE NOTE (S136 hardening): you may NOT be able to Write into
scrml-support/ from a sub-agent context. So:

  - Use `/tmp/dev-<N>-<persona>-iter-N.scrml` for your compile-test iterations.
  - Use the BRIEF.md's compile command, BUT redirect `-o /tmp/dev-<N>-dist/`
    for your iterations (not the gauntlet round's dist/).
  - Iterate as needed. When done (PASS or stuck), return your FINAL content
    inline in your result message using the exact markers below.
  - DO NOT attempt to Write to scrml-support/docs/gauntlets/gauntlet-r25/.
    The runner writes that file from your returned content.

Append the friction-report HTML comment block at the END of your scrml per
the format in BRIEF.md.

Final-result format — your reply message MUST contain this exact block, with
nothing else allowed between the markers:

===SCRML-START===
<entire .scrml file content, including the friction-report HTML comment block>
===SCRML-END===

After the SCRML-END marker, include your summary:
  - COMPILE_STATUS: PASS | FAIL <error-code>
  - ITERATIONS_TO_PASS: <N>
  - FRICTION_ITEM_COUNT: <N>
  - ANTI_PATTERN_TRAPS_HIT: <count of forbidden-construct reaches caught by canon vs caught by compiler>
  - SELF_RATED_SCORE: <1-100, your honest estimate per the brief's rubric>
  - WOULD_USE_IT_SCORE: <1-10>

Per the persona's authoring rule: NEVER invent scrml syntax. When uncertain,
re-read the canon. The canon is the only authority.
```

For each dispatch, substitute:
- `<N>` = 1, 2, 3, ...
- `<persona>` = whichever persona BRIEF.md names for that dev slot
- `subagent_type` = `scrml-dev-<persona>` (e.g., `scrml-dev-react`)

Agent call shape (one example — replicate N times with above substitutions):

```
Agent({
  subagent_type: "scrml-dev-react",
  description: "R25 dev-1 React",
  prompt: <the prompt above with N=1 / persona=react>,
  run_in_background: true
})
```

**N Agent calls, ONE message.** The runtime parallelizes them.

---

## Step 2.5 — Extract content + write final files (runner-side)

As each dev returns (notification arrives), do this BEFORE moving on:

1. **Extract** the content between `===SCRML-START===` and `===SCRML-END===`
   markers from the dev's result message. The extracted block IS the .scrml
   file content verbatim.
2. **Write** the extracted content to the canonical path:
   `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/dev-<N>-<persona>.scrml`
3. **Record** the dev's summary fields (COMPILE_STATUS, ITERATIONS_TO_PASS, etc.)
   for later aggregation.

If a dev's result lacks the SCRML-START/SCRML-END markers (or the content
between them is empty / malformed): re-dispatch ONCE with an explicit
reminder of the marker requirement. If the second attempt also lacks
markers, mark that dev FAILED-NO-CONTENT and continue with the others.

If a dev returns marker-wrapped content that contains HTML entities (`&lt;`,
`&gt;`, `&amp;`, `&quot;`, `&#39;`) — these are encoding-artifact from the
result transport, NOT in the dev's source. Decode before writing:
- `&lt;` → `<`
- `&gt;` → `>`
- `&amp;` → `&`
- `&quot;` → `"`
- `&#39;` → `'`

The runner becomes the single point of disk authority — the dev never writes
to the gauntlet output dir, only to /tmp.

---

## Step 3 — Monitor + wait for completion

You will receive notifications as each background dev completes. Do not poll.
For each completion, execute Step 2.5 (extract + write). When ALL N have
completed (and you've written their files), proceed to Step 4.

If any dev crashes (API error / OOM / timeout):
- Check if a partial /tmp/dev-<N>-* file exists with substantive content;
  if so, treat as final output (note the crash in the report).
- If nothing usable exists, re-dispatch ONCE with the same prompt. If the
  second attempt also crashes, mark that dev FAILED and continue with the
  others.

---

## Step 4 — Dispatch N overseers in PARALLEL (one message, N Agent calls)

For each dev that produced a final .scrml file (now written by the runner),
dispatch a gauntlet-overseer. The overseer compiles independently and
classifies — its verdict supersedes the dev's self-report.

Overseer dispatch prompt shape:

```
Verify dev-<N>-<persona>'s gauntlet R25 result.

Source: /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/dev-<N>-<persona>.scrml
Dev's self-reported verdict: <COMPILE_STATUS the dev returned>

Run the canonical compile command:
  cd /home/bryan-maclee/scrmlMaster/scrmlTS
  bun run compiler/src/cli.js compile \
      /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/dev-<N>-<persona>.scrml \
      -o /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/dist/

ALSO verify the emitted client JS passes `node --check`:
  for f in /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/dist/dev-<N>-<persona>*.client.js; do
    node --check "$f" || echo "node --check FAILED: $f"
  done

Then classify per your standard protocol:
  - PASS: source uses valid scrml; compiler exits 0 AND emitted JS passes node --check.
  - DEV ERROR: source uses invalid scrml (React-style JSX, retired syntax,
    invented constructs); compiler correctly rejected it.
  - COMPILER BUG: source uses valid scrml per current canon (kickstarter v2 +
    SPEC); compiler crashed or produced bad output. File reproducer evidence.
  - PARTIAL: compiled exit-0 but emitted JS has issues — mangled names, raw
    `or`/`and` tokens, `_result = return;` statements, etc. (R24 surfaced
    several of these patterns; see known-gaps Bugs 28-34 for the canonical
    list.) Inspect dist/ output.

Report back:
  - OVERSEER_VERDICT: PASS | DEV-ERROR | COMPILER-BUG | PARTIAL
  - COMPILE_OUTPUT: <full output of the compile command, tail -50>
  - NODE_CHECK_OUTPUT: <pass/fail per dist file>
  - DIST_FILES: <ls of dist/ files produced for this dev>
  - DISAGREEMENT_WITH_DEV: <yes/no — did your verdict differ from the dev's self-report?>
  - SUSPECTED_COMPILER_BUGS: <list any compiler-bug candidates you identified>
  - ANTI-PATTERN_TRAPS_IN_SOURCE: <count of forbidden constructs found in the dev's source>
```

For each overseer dispatch, substitute `<N>` and `<persona>` per dev. N Agent
calls in ONE message; `subagent_type: "gauntlet-overseer"` for all N;
`run_in_background: true`.

---

## Step 5 — Aggregate + write the round report

After all N overseers complete, write the report to:

  `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25-report.md`

Format (model on prior round reports at `scrml-support/docs/gauntlets/gauntlet-r{13,14,17,18,19,24}-report.md` — especially r24 for the most recent shape).

The report includes (mirroring R24 structure):

- **Round-execution friction** (any dispatch-infrastructure issues this round)
- **Verdict at a glance** (per-dev table)
- **Per-dev summary** (output path / compile / iterations / 3 most severe friction / overseer notes / would-use-it / critical canon gap)
- **Aggregated friction themes** (cross-dev frequency analysis)
- **Anti-pattern trap report** (how well canon caught each forbidden construct)
- **Compiler bugs surfaced** (per overseer COMPILER-BUG verdict, with reproducer)
- **Post-Sxxx canon-clear health rating** (per-surface clear/partial/absent rollup)
- **Overall round verdict + recommendations** (GREEN/YELLOW/RED + top 3 canon gaps + top 3 compiler bugs + persona lessons + next-round candidate shape)
- **Tags** (round number, theme, any signal tags)

Write the report file. That's the deliverable — the user will read it.

---

## Step 6 — Report to user

Send a single text message back to the user:

```
Gauntlet R25 complete.

Report: scrml-support/docs/gauntlets/gauntlet-r25-report.md

Devs: N/M PASS compile, K/M FAIL.
Compiler bugs surfaced: J (see report §"Compiler bugs surfaced").
Canon clear health: GREEN/YELLOW/RED.
Anti-pattern traps: X total across devs; Y caught by canon, Z caught only by compiler.

Top 3 canon gaps:
1. ...
2. ...
3. ...

Top 3 compiler bugs to file:
1. ...
2. ...
3. ...
```

That's the runner's end-of-run output. The user will read the full report file
and decide next steps.

---

## Hard rules for the runner (you)

1. **NO session-start protocol.** Do not read pa.md, hand-off.md, master-list.md,
   user-voice. You are not the project PA.
2. **NO `isolation: "worktree"`** on dev or overseer dispatches.
3. **NO commits.** This run produces artifacts; whether to commit them is the
   user's call — the runner does NOT commit (unless the user explicitly asks
   for a commit after they've read the report).
4. **NO writes to compiler source.** If a dev or overseer surfaces a compiler bug,
   the report DOCUMENTS it. Fixing is a separate compiler-source dispatch by the
   project PA, not by this runner.
5. **PARALLEL dispatch is mandatory.** All devs in ONE message; all overseers in
   ONE message. Sequential dispatch wastes wall-clock time.
6. **Trust the overseer over the dev self-report.** When `DISAGREEMENT_WITH_DEV: yes`,
   the overseer's verdict is the report's verdict.
7. **You (runner) are the single point of disk authority for the gauntlet output
   dir.** Devs iterate in /tmp; devs return content in result messages; you
   write the canonical files. This sidesteps the S136 dispatch-permission gap.
8. **Always run `node --check` on emitted client JS** during overseer phase.
   R24 surfaced multiple cases of compile-exit-0 + invalid-JS output (Bugs 28,
   29, 31, 32). Compile-exit-0 alone is NOT a PASS signal.
9. **If 3+ devs FAIL compile**, the round is a CANON-CLEAR HEALTH RED signal.
   Surface this in the report's overall verdict prominently.
