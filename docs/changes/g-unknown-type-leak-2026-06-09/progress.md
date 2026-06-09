# progress — g-unknown-type-leak-2026-06-09

## 2026-06-09 — Phase 0 survey-confirm (COMPLETE)

Startup: pwd = /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2ba295a0f77b66ce
Baseline `bun run test`: 23538 pass / 220 skip / 1 todo / 0 fail (2 runs; the earlier
2-fail was flaky integration timing — both clean re-runs are 0 fail; contract baseline = 0 fail).

Survey findings (verified against HEAD efdec093):
- Leak site type-system.ts:2594-2595 "Unresolvable — return asIs (conservative; no error here)" — CONFIRMED.
- any-check: typeTextMentionsAnyToken @3678 (flat atomize); checkAnyTypeForbidden @3720; its
  scanStructBodyRaw @3746 (the OTHER scanStructBodyRaw @3524 belongs to checkFunctionTypedStructFields).
- any-check struct/error gate @3778: `decl.typeKind !== "struct" && decl.typeKind !== "error"` —
  MISSES enum, tuple, AND type-alias. EMPIRICALLY CONFIRMED any MISSES enum-payload + alias-RHS + tuple
  (probe exits 0). My symmetric extension must close these for E-TYPE-ANY-FORBIDDEN too.
- any-check param-string branch @3808-3818 is DEAD: function-decl params are OBJECTS {name, typeAnnotation}
  (ast-builder.js:7938), never strings. Generic n.typeAnnotation walk @3794-3801 catches param types;
  fn return is `returnTypeAnnotation` @3821. CONFIRMED via deep node-dump probe.
- Wiring @15924 is BEFORE importedTypes seed @15931-15938. checkUnknownTypeNames MUST fire AFTER 15938.
  checkAnyTypeForbidden stays at 15924 (token-scan, registry-independent).
- buildTypeRegistry Pass-1 @3049-3052 registers EVERY decl name as tUnknown() placeholder → presence
  (typeRegistry.has) is the forward-ref-safe test. Forward-ref probe (B{a:A}, A later) exits clean.
- BUILTIN_TYPES @933 (incl asIs @962, 8 PascalCase error/enum types). NAMED_SHAPES @998-1006 all
  lowercase (email/url/uuid/phone/date/time/color) → PascalCase gate /^[A-Z]/ auto-exempts.
- leading-ident regex /^([A-Za-z_$][A-Za-z0-9_$]*)\??/ @1553 — leaf extraction tolerating trailing `?`.
- type-alias: typeKind:"" raw:RHS-verbatim (ast-builder.js:286). tuple: typeKind:"tuple" raw:"{...}".
- import-decl node: specifiers:[{imported,local,pinned}] + names:[...] — collect both imported+local.
  Nested inside markup `${...}` (not top-level) → deep-walk to collect. CONFIRMED.
- L22 type-arg (parseVariant 2nd arg / formFor for= / reflect) = call-arg ident / markup attr, NO
  typeAnnotation field → my walk never sees them; they own their codes (_resolveAndCheckL22TypeName @13887).
- board.scrml single-file exits clean today (LoadCardRow silent asIs); naive check would false-fire.
  import-specifier exemption keeps it clean in BOTH modes.

Integration shape chosen: TWO-DRIVER (not full shared-traversal refactor). checkAnyTypeForbidden stays
at its current site (registry-independent token-scan) and is BROADENED to cover enum-payload/alias/tuple.
A NEW checkUnknownTypeNames fires AFTER the importedTypes seed (registry-dependent). Both share the same
locus set by construction (broadened gate + identical traversal helpers). This avoids moving the working
any-check off its fire-timing while still achieving symmetric loci coverage. Rationale: the any-check is
registry-INDEPENDENT (must NOT move past-seed is harmless but unnecessary), the unknown-check is
registry-DEPENDENT (MUST be post-seed) — a single shared call cannot satisfy both timing constraints
cleanly, so two drivers sharing leaf-extraction helpers is the cleanest correct shape.

No contradictions with the brief. Proceeding to Phase 1.

## 2026-06-09 — Phase 1 predicate + leaf-walk (COMPLETE)

Added to type-system.ts (after typeTextMentionsAnyToken):
- isUnrecognizedTypeNameAtom(name, typeRegistry, importSpecifierNames) — 5-clause leaf classifier
  (PascalCase gate / not-builtin / not-asIs / registry-presence / not-imported).
- forEachTypeNameLeaf(typeExpr, visit) — position-aware leaf-base traversal mirroring resolveTypeExpr's
  own branch structure (lifecycle post-type / fn-type carve / union recurse / negation carve /
  enum-subset base-only / predicate carve / conjunction carve / array elem / map key+value / snippet
  param / inline-struct field types / leaf leading-ident strip with lin + `?` handling).
Both exported (mirrors the §59 findMapEntryColon/isComparableType "for typer-unit tests" precedent).
Isolation test compiler/tests/unit/unknown-type-name-predicate.test.js — 38 pass / 0 fail.

## 2026-06-09 — Phase 2+3 driver + symmetric any-extension + wiring (COMPLETE)

Replaced checkAnyTypeForbidden (old 3918-4032) with:
- collectImportSpecifierNames(topNodes) — deep-walks import-decl nodes, returns imported+local names.
- forEachTypeAnnotationLocus(typeDecls, topNodes, fileSpan, visit) — SHARED locus traversal yielding
  (typeText,label,span) at ALL loci: struct/error/tuple field types (nested inline-struct expanded),
  enum-variant PAYLOAD field types, type-alias RHS (typeKind:""), cell typeAnnotation (also reaches fn
  param objects via generic walk), fn returnTypeAnnotation. Both checks drive off this → symmetric loci
  BY CONSTRUCTION.
- checkAnyTypeForbidden (rewritten) — consumes the shared traversal + typeTextMentionsAnyToken.
- checkUnknownTypeNames(typeDecls, topNodes, typeRegistry, exemptTypeNames, errors, fileSpan) — consumes
  the shared traversal + forEachTypeNameLeaf + isUnrecognizedTypeNameAtom. Fires E-TYPE-UNKNOWN-NAME.

Wiring: checkUnknownTypeNames called AFTER the importedTypes seed (registry-dependent). checkAnyTypeForbidden
stays at its prior pre-seed site (registry-independent token-scan).

SCOPE DISCOVERY (within task scope, not expansion): the brief's exemption list named db-block +
native-parser but MISSED machine-typed state cells. `@state: M` where `< machine name=M >` annotates the
cell with the MACHINE name — machines live in machineRegistry, NOT typeRegistry → 98 false-fires (66 `M`
+ `*Machine`/`*Flow`) across 103 failing tests on first full run. Fix: exemptTypeNames = import specifiers
+ machine names (from machineDecls[].engineName). After fix: full suite 23576 pass / 0 fail, ZERO spurious
UNKNOWN-NAME/ANY fires.

Empirically verified: all 6 loci fire E-TYPE-UNKNOWN-NAME (struct-field/alias/enum-payload/cell/fn-return/
fn-param); any-check now ALSO fires at enum-payload/alias/tuple (symmetric); negatives clean
(asIs/Company-PascalCase/email/Status req/forward-ref/enum-subset/map); board.scrml single-file AND full
36-file flagship compile clean (LoadCardRow import-exempt in both modes).

## 2026-06-09 — Phase 4 full test file + map-key interaction (COMPLETE)

INTERACTION decision (conscious, per brief default): an unknown MAP KEY is OWNED by
E-MAP-KEY-NOT-COMPARABLE (§59.4) — the unknown key collapses to a non-comparable `asIs` key that
check already rejects. To honor the brief's "don't double-fire" default, threaded an
`opts.emitMapKeys` flag through forEachTypeNameLeaf: the unknown-check passes {emitMapKeys:false}
(skip keys), the any-check keeps keys (`any` is invalid everywhere). Map VALUES still scanned by both.
Verified: unknown map-key → only E-MAP-KEY-NOT-COMPARABLE; unknown map-value → E-TYPE-UNKNOWN-NAME;
any map-key → E-TYPE-ANY-FORBIDDEN (+ E-MAP-KEY-NOT-COMPARABLE).

compiler/tests/unit/unknown-type-forbidden.test.js — 25 pass / 0 fail. Cross-stream helper +
partition lock. Positives: cell/struct-field/enum-payload/alias-RHS/fn-param/fn-return/array-elem/
inline-struct-field/union-member/map-value. Negatives: primitive/asIs-every-locus/named-shapes/
builtin-errors/same-file/forward-ref/Company-substring/Status-req-validator/enum-subset/number(>0).
Cross-file: multi-file import / aliased import / single-file-mode import exemption. Interaction:
map-key no-double-fire. Machine: `@state: M` exempt.

## 2026-06-09 — Phase 5 SPEC (COMPLETE)

compiler/SPEC.md:
- NEW §14.1.2 "Unrecognized type names — every type must be defined" (after §14.1.1; riding the hard-line
  template: canonical rule + asIs escape + loci + resolution + carve-outs + parallel-shape).
- REWROTE the §14.1.1 deferral NOTE (was "separate broader gap tracked as follow-on") → a symmetric-with-
  §14.1.2 note (both now closed).
- AMENDED §14.1.1 canonical-rule loci (now names struct/error/enum-payload/tuple/alias-RHS) + added §14.1.2
  to its parallel-shape line.
- §34: AMENDED the E-TYPE-ANY-FORBIDDEN row (broadened loci + symmetric note) + INSERTED the
  E-TYPE-UNKNOWN-NAME row adjacent (loci, typeRegistry/§53.14.5 resolution, §21.8 cross-file, asIs never-
  fires, map-key/machine/db carve-outs, emit site = decl-binding sites NOT resolveTypeExpr, severity Error).
- Added §14.1.1/§14.1.2 to the §19.9.8 "what scrml is NOT" bullet list.
- Added the reverse-direction parallel-shape line to §42.1 (§14.1.1/§14.1.2/§19.9.8) — bidirectional
  hole-detection.
Note: the brief's §53.14.5/.6 line numbers (~29981) were stale; §53.14.5 is the typeRegistry-resolution
cross-ref anchor (used throughout the type-as-argument family ~20k), anchored accordingly.

## 2026-06-09 — Phase 6 corpus re-sweep (COMPLETE — 0 migrations)

Re-swept 1002 .scrml (stdlib + samples + examples + self-host, single-file mode, EXCLUDING
native-parser) with the CURRENT binary for BOTH E-TYPE-UNKNOWN-NAME and (broadened) E-TYPE-ANY-FORBIDDEN
at the new loci (enum-payload / alias-RHS / tuple). RESULT: 0 files with new-check fires. Also multi-file
project sweep (every examples/* + samples/* root): 0 fires. No genuine corpus migration needed — the S174
any-migration left no un-migrated `any` in the new loci, and the import-specifier exemption keeps
single-file imports clean. The only fires encountered anywhere were the 98 machine-typed-cell false-fires
on the first full-suite run, fixed by the machine-name exemption (Phase 2+3), not corpus migration.

## 2026-06-09 — Phase 7 R26 empirical verification (COMPLETE) + DONE

R26 table (post-fix binary):
| probe | expect | result |
|-------|--------|--------|
| leak reproducer (struct/alias/enum-payload/cell/array/fn-param/fn-return) | all fire UNKNOWN-NAME | 7 fires, all 6 loci ✓ |
| flagship examples/23-trucking-dispatch (multi-file) | 0 false-fire | 0 UNKNOWN-NAME, 0 ANY ✓ |
| board.scrml SINGLE-FILE (LoadCardRow import) | 0 false-fire | 0 UNKNOWN-NAME ✓ |
| clean probe (asIs/imported/forward-ref/NetworkError/email/declared-PascalCase) | 0 false-fire | 0 UNKNOWN-NAME ✓ |

Baseline `bun run test`: 23538 pass / 0 fail.
Final    `bun run test`: 23601 pass / 0 fail (+63 = 38 predicate + 25 dedicated tests).

DONE. Every leak reproducer fires; flagship + full corpus + full test suite GREEN.
