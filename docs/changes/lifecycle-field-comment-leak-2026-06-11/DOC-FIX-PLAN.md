# DOC-FIX-PLAN — Direction 1 (g-lifecycle-struct-field-const-notfire)

**Apply AFTER the comment-leak parse fix lands** (so the corrected example can keep natural
inline comments). Re-verify the corrected example against the POST-FIX baseline before committing.

## What's wrong
PRIMER §6.5 and kickstarter §3.2 teach the lifecycle feature with a plain local
`const u: User = {…}` binding read via bare `u.passwordHash`, annotated `// E-TYPE-001`.
That binding kind is NOT tracked (Landing-1 tracks `<state>`-cell struct bindings). Verified S184:
const-form → no fire; cell-form `<u>: User = {…}` + `@u.passwordHash` → fires correctly.

## Fix = swap the const-form binding for the idiomatic cell-form. Positions tables stay.

### Replacement example (VERIFIED S184 fires E-TYPE-001 on pre-read, passes post-read — `/tmp/s184-lifecycle/final.scrml`)
```scrml
type User:struct = {
    id: number,
    email: string,
    passwordHash: (not to string)        // starts absent; transitions to string after hashing
}

<u>: User = { id: 1, email: "a@b.com", passwordHash: not }

function hashUserPassword(raw: string) {
    const leaked    = @u.passwordHash      // E-TYPE-001 — pre-transition read
    @u.passwordHash = hashPassword(raw)    // transition: assign a string-shaped value
    const ok        = @u.passwordHash      // OK — post-transition read
}
```
(Reads/writes must sit in a logic context; the function is the idiomatic "hash a password"
operation. The bare const-form `const u: User = {…}; u.passwordHash` is TS idiom — scrml state
lives in `<cells>`, which is exactly the §14.12.3 enumerated Shape-1 + struct-field position.)

## Apply locations (current-truth line ranges — re-confirm before edit)
1. **PRIMER §6.5** — `docs/PA-SCRML-PRIMER.md` lines ~484-489. Current:
   `const u: User = { id: 1, email: "a@b.com", passwordHash: not }` / `const hash = u.passwordHash …`
   / `u.passwordHash = hashPassword(rawPassword)` / `const hashAfter = u.passwordHash`.
   → replace the `const u …` block with the cell-form block above.
2. **kickstarter §3.2** — `docs/articles/llm-kickstarter-v2-2026-05-04.md` lines ~252-256. Same
   const-form block (`rawPw` variant) → same cell-form replacement.

## NOT in scope (do not touch)
- **SPEC §14.12.1** (SPEC.md ~8189-8197): shows ONLY the type decl + prose "Reads of
  `user.passwordHash`…"; no const-binding shown. Its inline field comment is fixed by the
  compiler parse-fix. Post-fix, just confirm the §14.12.1 type-decl example compiles clean.
- **Positions tables** (PRIMER ~513-521 / kickstarter ~263-271): correct — keep.

## Carry-forward CANDIDATE surfaced during this probe (separate gap, do NOT chase here)
- SPEC §14.12.6 fn-return examples (SPEC.md ~8324 / ~8353) use `const u = loadUser(42)` +
  `u.name` for the presence-progression hybrid. Whether fn-return lifecycle tracking fires on a
  plain `const u` binding (vs the Sub-Pass-2.b `<state>` cell form the tests use) is UNVERIFIED —
  same const-binding-not-tracked shape as the struct-field gap, different mechanism (§14.12.6).
  File as a candidate if/when the user wants it probed.
