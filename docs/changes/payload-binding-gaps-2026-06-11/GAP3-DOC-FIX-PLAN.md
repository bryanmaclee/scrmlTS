# GAP 3 — SPEC §41.13 parseVariant example doc fix (apply AFTER Gap 1 lands)

SPEC.md ~20644-20646 currently:
```
    const result = parseVariant(raw, LoadResult) !{
        | ::ParseError msg :> { fail LoadError::Malformed(msg) }
    }
```
BROKEN: `::ParseError` is the ENUM name, not a variant → E-SCOPE-001 + E-TYPE-080. The normative text
(§20663) says the handler matches the FOUR ParseError VARIANTS (exhaustive).

## Corrected example (VERIFY against the post-Gap-1 baseline before committing — uses multi-field ::InvalidPayload):
```
    const result = parseVariant(raw, LoadResult) !{
        | ::MissingDiscriminator          :> { fail LoadError::Malformed("missing discriminator") }
        | ::UnknownVariant(tag)           :> { fail LoadError::Malformed("unknown variant: " + tag) }
        | ::InvalidPayload(field, reason) :> { fail LoadError::Malformed(field + ": " + reason) }
        | ::Malformed(reason)             :> { fail LoadError::Malformed(reason) }
    }
```
DEPENDS ON Gap 1 (the `::InvalidPayload(field, reason)` multi-field arm). Apply + re-verify after Gaps 1+2 land.
PA-direct doc edit (SPEC.md is normative — same-length-ish; re-check the SPEC-INDEX footer line count after).
