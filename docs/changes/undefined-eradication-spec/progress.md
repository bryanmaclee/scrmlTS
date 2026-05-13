# undefined-eradication-spec progress

Dispatch: S89 Wave 7.A mirror for `undefined`. Extends `null`-eradication landed at e621d91.

## 2026-05-13 — kickoff
- Verified worktree (`agent-a8137576e2ddfed79`); main branch clean.
- `bun install` + `bun run pretest` baseline clean.
- Read primary.map.md + error.map.md.
- Reviewed prior S89 Wave 7.A commit (e621d91): canonical home is SPEC §42 (lines 18221+).
- Detected branch base predated e621d91 + 30 main commits. Rebased onto main (clean). Re-baselined pretest.
- Audited `\bundefined\b` in compiler/SPEC.md: 53 sites total.

## Site classification
- **MIGRATE (6):** lines 3723, 3725, 3751 (`<#id>.value` is undefined → `not`), 4333 (W-LIFECYCLE-008 catalog prose), 10464 (match-without-else produces undefined → `not`), 14819 (E-TYPE-081 "possibly-undefined value" → "possibly-`not` value").
- **LEAVE (47):** §42-self / JS-host interop / English terms ("undefined variable", "undefined behavior", "undefined field") / JS-output codegen fenced blocks / E-SYNTAX-042 catalog rows / error-code names (E-DERIVED-ENGINE-INITIAL-UNDEFINED) / user-voice verbatim quotes / TS pseudo-code internal compiler logic.

## Plan
- Commit 1: migrate 6 scrml-prose sites.
- Commit 2: rename W-NULL-IN-SCRML-SOURCE → W-ABSENCE-IN-SCRML-SOURCE (Option α; warning code mirrors the rule, which already covers BOTH null and undefined).
- Commit 3: `""` (and `0`, `false`, `[]`, `{}`) vs `not` defined-value normative note in §42.
- Commit 4: SPEC-INDEX refresh.

## 2026-05-13 — commit 1 landed (d60fc40)
- 6 scrml-prose sites migrated to `not`.
- Pre-commit gate: 11323 pass, 0 fail.

## 2026-05-13 — commit 2 prep
- Rename W-NULL-IN-SCRML-SOURCE → W-ABSENCE-IN-SCRML-SOURCE (Option α).
- 6 SPEC.md occurrences updated; 2 historical-rename references preserved.
- No validator code yet emits this code (out-of-scope for this dispatch per dispatch §"Out of scope").

## 2026-05-13 — commit 2 landed (fb78dc0)
- Rename W-NULL → W-ABSENCE. 12065 pass, 0 fail.

## 2026-05-13 — commit 3 prep
- §42.1.1 new subsection — "Defined Values vs. Absence — `""` is NOT Absence".
- Normative statements: `""`, `0`, `false`, `[]`, `{}` are defined values; not absence.
- Audit guidance: mechanical rewrites must NOT touch defined-value forms.
- User voice quoted verbatim.

## 2026-05-13 — commit 3 landed (9f01858)
- §42.1.1 new subsection landed.

## 2026-05-13 — commit 4 prep
- SPEC-INDEX.md refresh: ran `bun run scripts/regen-spec-index.ts` (auto line-range update).
- Total lines 27,003 → 27,037.
- §6, §34, §42 summary cells updated for rename + §42.1.1.
- Header note rewritten with S89-undefined-eradication entry; S89-null-eradication entry preserved beneath.
- Quick Lookup: W-NULL → W-ABSENCE entry renamed; new §42.1.1 entry added.
