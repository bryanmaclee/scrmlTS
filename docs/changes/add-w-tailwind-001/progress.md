# Progress: add-w-tailwind-001 — W-TAILWIND-001 warning

- [start] Worktree clean, deps installed.
- [baseline] Unit tests: 6020 pass / 0 fail. Full suite: 7821 pass / 40 skip / 134 fail (all env, missing samples/compilation-tests/dist/ from missing pretest hook in sandboxed env).
- [analysis] Detection rule per task brief: class contains `:` or `[` AND `getTailwindCSS(name) === null` → fire W-TAILWIND-001.
- [analysis] Note (will flag in report): class names like `dark:p-4` or `weird:p-4` get `getTailwindCSS` returning a truthy unprefixed rule (line 668-669 in tailwind-classes.js silently strips unrecognized prefixes). Under literal task-brief rule, those don't fire. This is a separate silent bug worth follow-up.
- [plan]
  - Add `findUnsupportedTailwindShapes(source)` to `compiler/src/tailwind-classes.js` returning lint diagnostics for class strings in source.
  - Wire into `compiler/src/api.js` next to `lintGhostPatterns`.
  - SPEC §26.3: append normative sentence about W-TAILWIND-001.
  - SPEC §34: add W-TAILWIND-001 row.
  - SPEC-INDEX.md: regenerate via existing script (note bash sandbox limits) or manually adjust.
  - Add `compiler/tests/unit/compiler-warnings-tailwind.test.js`.
