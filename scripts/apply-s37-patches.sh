#!/usr/bin/env bash
# apply-s37-patches.sh
# Applies S37 spec amendments to compiler/SPEC.md
# Generated: 2026-04-03
# Run from project root: bash scripts/apply-s37-patches.sh

set -e

SPEC="compiler/SPEC.md"

if [ ! -f "$SPEC" ]; then
    echo "Error: $SPEC not found. Run from project root."
    exit 1
fi

echo "Applying S37 spec amendments to $SPEC..."

# ============================================================
# S37-AM-001: Enum variant access :: -> .
# ============================================================

# §14.5: Fully qualified and shorthand enum access examples
sed -i 's/- Fully qualified: `Direction::North`/- Fully qualified: `Direction.North`/' "$SPEC"
sed -i 's/- Shorthand (when type is inferred from context): `::North`/- Shorthand (when type is inferred from context): `.North`/' "$SPEC"
sed -i 's/- The `::` sigil is reserved for enum variant access. It is distinct from `.` (property access) and `:` (type annotation)./- Enum variant access uses `.` (dot notation). In fully qualified form `TypeName.VariantName`, the `.` separates the type name from the variant name. This is a distinct syntactic production from property access (§5) — the compiler disambiguates by whether the left-hand side resolves to an enum type. The shorthand form `.VariantName` is valid only where the enum type is inferable from context (e.g., inside a match arm for a known enum type, or in an assignment where the target has a declared enum type).\n- The `::` sigil is NOT valid for enum variant access. Any `TypeName::VariantName` expression in scrml source SHALL be a compile error (E-TYPE-060: use `.` for enum variant access, not `::`).\n\n**Normative statements:**\n\n- A fully qualified enum variant SHALL be written `TypeName.VariantName`. The compiler SHALL resolve the `.` as variant access when the left-hand operand is an enum type name.\n- A shorthand variant reference SHALL be written `.VariantName` and SHALL be valid only in positions where the enum type is determinable from context. A shorthand variant reference in a position where the type cannot be inferred SHALL be a compile error (E-TYPE-061: cannot infer enum type for shorthand variant `.VariantName`).\n- `TypeName::VariantName` SHALL be a compile error (E-TYPE-060). The error message SHALL say: "Enum variant access uses `.` not `::`. Did you mean `TypeName.VariantName`?"/' "$SPEC"

# §14.6: Update the default arm text
sed -i 's/- A `_` arm is a valid default arm./- An `else` arm is a valid default arm./' "$SPEC"

# All ::VariantName patterns in match arm position -> .VariantName
# These are in code blocks (scrml examples). Pattern: spaces then ::Name
# In match arms: 4 spaces then ::Name (inside code blocks)
sed -i 's/    ::North /    .North /g' "$SPEC"
sed -i 's/    ::South /    .South /g' "$SPEC"
sed -i 's/    ::East  /    .East  /g' "$SPEC"
sed -i 's/    ::West  /    .West  /g' "$SPEC"
sed -i 's/    ::Circle(r)/    .Circle(r)/g' "$SPEC"
sed -i 's/    ::Rectangle(w, h)/    .Rectangle(w, h)/g' "$SPEC"
sed -i 's/    ::Rectangle(height: h, width: w)/    .Rectangle(height: h, width: w)/g' "$SPEC"
sed -i 's/    ::Rectangle(w)/    .Rectangle(w)/g' "$SPEC"
sed -i 's/    ::Point /    .Point /g' "$SPEC"
sed -i 's/    ::Point$/    .Point/' "$SPEC"
sed -i 's/    ::Active  /    .Active  /g' "$SPEC"
sed -i 's/    ::Pending /    .Pending /g' "$SPEC"
sed -i 's/    ::Closed  /    .Closed  /g' "$SPEC"
sed -i 's/    ::On  /    .On  /g' "$SPEC"
sed -i 's/    ::Off /    .Off /g' "$SPEC"
sed -i 's/    ::Employee(name: n, department: d)/    .Employee(name: n, department: d)/g' "$SPEC"
sed -i 's/    ::Contractor(name: n)/    .Contractor(name: n)/g' "$SPEC"
sed -i 's/    ::Some(s)/    .Some(s)/g' "$SPEC"
sed -i 's/    ::None   /    .None   /g' "$SPEC"
sed -i 's/    ::None$/.None/g' "$SPEC"
sed -i 's/    ::Add(left, right)/    .Add(left, right)/g' "$SPEC"
sed -i 's/        ::Lit(v) -> v/        .Lit(v) => v/g' "$SPEC"
sed -i 's/        ::Add(l, r) -> l + r/        .Add(l, r) => l + r/g' "$SPEC"
sed -i 's/    ::Lit(v) -> v/    .Lit(v) => v/g' "$SPEC"

# §34.4 lin+match examples
sed -i 's/    ::Admin -> useAdminToken(token)/    .Admin => useAdminToken(token)/g' "$SPEC"
sed -i 's/    ::User  -> useToken(token)/    .User  => useToken(token)/g' "$SPEC"
sed -i 's/    ::Guest -> discardToken(token)/    .Guest => discardToken(token)/g' "$SPEC"
sed -i 's/    ::Guest -> doSomethingElse()/    .Guest => doSomethingElse()/g' "$SPEC"
sed -i 's/        ::Admin -> adminAuth(token)/        .Admin => adminAuth(token)/g' "$SPEC"
sed -i 's/        ::User  -> userAuth(token)/        .User  => userAuth(token)/g' "$SPEC"
sed -i 's/        ::Guest -> guestAuth(token)/        .Guest => guestAuth(token)/g' "$SPEC"

# §19 error arm ::TypeName patterns (:: -> . but keep -> as-is for error arm syntax)
sed -i 's/| ::SQLError /| .SQLError /g' "$SPEC"
sed -i 's/| ::NetworkError /| .NetworkError /g' "$SPEC"
sed -i 's/| ::NotFoundError /| .NotFoundError /g' "$SPEC"
sed -i 's/| ::AuthError /| .AuthError /g' "$SPEC"
sed -i 's/| ::ConflictError /| .ConflictError /g' "$SPEC"
sed -i 's/| ::ValidationError /| .ValidationError /g' "$SPEC"
sed -i 's/| ::InsufficientFundsError /| .InsufficientFundsError /g' "$SPEC"

# §20 navigation enum variants
sed -i "s/navigate(path, ::Hard)/navigate(path, .Hard)/g" "$SPEC"
sed -i "s/navigate(path, ::Soft)/navigate(path, .Soft)/g" "$SPEC"
sed -i "s/\`::Hard\` and \`::Soft\`/\`.Hard\` and \`.Soft\`/g" "$SPEC"
sed -i "s/Calling \`navigate(path, ::Hard)\`/Calling \`navigate(path, .Hard)\`/g" "$SPEC"

# Error messages that reference ::VariantName
sed -i "s/\`::VariantName\` instead of a plain identifier/\`.VariantName\` instead of a plain identifier/g" "$SPEC"
sed -i "s/\`::VariantName\` form/\`.VariantName\` form/g" "$SPEC"
sed -i "s/use fully qualified \`TypeName::VariantName\`/use fully qualified \`TypeName.VariantName\`/g" "$SPEC"
sed -i "s/Shorthand: \`::VariantName\`/Shorthand: \`.VariantName\`/g" "$SPEC"
sed -i "s/Fully qualified: \`TypeName::VariantName\`/Fully qualified: \`TypeName.VariantName\`/g" "$SPEC"

# §18.8.2 nullable match patterns
sed -i 's/use `::Some(value)` \/\n`::None`/use `.Some(value)` \/\n`.None`/g' "$SPEC"
sed -i "s/\`::Some(value)\` matches/\`.Some(value)\` matches/g" "$SPEC"
sed -i "s/\`::None\` matches/\`.None\` matches/g" "$SPEC"
sed -i "s/\`::Some(value)\` and \`::None\` are the valid arm patterns/\`.Some(value)\` and \`.None\` are the valid arm patterns/g" "$SPEC"
sed -i "s/The bound variable in \`::Some(value)\`/The bound variable in \`.Some(value)\`/g" "$SPEC"
sed -i "s/\`::VariantName\` syntax when the member is an enum variant, and use \`::Some(value)\`/\`.VariantName\` syntax when the member is an enum variant, and use \`.Some(value)\`/g" "$SPEC"
sed -i "s/\`::None\` when the union contains/\`.None\` when the union contains/g" "$SPEC"

# §18.13 arm pattern qualification text
sed -i "s/Shorthand: \`::VariantName\` — valid/Shorthand: \`.VariantName\` — valid/g" "$SPEC"
sed -i "s/Fully qualified: \`TypeName::VariantName\` — always valid/Fully qualified: \`TypeName.VariantName\` — always valid/g" "$SPEC"
sed -i "s/\`::VariantName\` (shorthand) SHALL be valid/\`.VariantName\` (shorthand) SHALL be valid/g" "$SPEC"
sed -i "s/\`TypeName::VariantName\` (fully qualified) SHALL always be valid/\`TypeName.VariantName\` (fully qualified) SHALL always be valid/g" "$SPEC"
sed -i "s/typed arms in a single match expression is valid. The/typed arms in a single match expression is valid. The/g" "$SPEC"

# §18.16 no `::` sigil text
sed -i "s/Arms for.*no \`::\` sigil, no \`is\` keyword./Arms for these types use literal values directly — no variant sigil, no \`is\` keyword./g" "$SPEC"

# §18.15 error table: update E-SYNTAX-010 trigger description
sed -i "s/| E-SYNTAX-010 | \`_\` wildcard arm is not the last arm | Error |/| E-SYNTAX-010 | \`else\` default arm is not the last arm | Error |/g" "$SPEC"

# W-MATCH-001 in §18.6
sed -i "s/W-MATCH-001: unreachable wildcard arm/W-MATCH-001: unreachable default arm/g" "$SPEC"

# W-MATCH-001 in §33 error codes table
sed -i "s/| W-MATCH-001 | §18.6 | Wildcard \`_\` arm is unreachable (all variants already covered) | Warning |/| W-MATCH-001 | §18.6 | Unreachable default \`else\` arm (all variants already covered) | Warning |/g" "$SPEC"

# W-NAV-001 reference in §33
sed -i "s/navigate(path, ::Hard) from/navigate(path, .Hard) from/g" "$SPEC"

# ============================================================
# S37-AM-002: Match arm separator -> =>
# (only in match arm position, not in !{} error arms or type signatures)
# ============================================================

# In match blocks (indented 4 spaces, not starting with |):
# Pattern: <4spaces><non-pipe><variant or literal><spaces>-> <body>
# Use a targeted approach: only lines inside match blocks with ::Variant or literal arms

# Variant match arms (:: already converted to . above, so patterns start with .)
sed -i 's/    \. \(.*\)) -> /    .\1) => /g' "$SPEC"
sed -i 's/    \.\(North\|South\|East\|West\|Circle\|Rectangle\|Point\|Active\|Pending\|Closed\|On\|Off\|Employee\|Contractor\|Some\|None\|Admin\|User\|Guest\|Add\|Lit\)\(.*\) -> /    .\1\2 => /g' "$SPEC"

# Literal arms in match blocks (4 spaces, string/number/boolean literal)
sed -i 's/    "\(.*\)" -> /    "\1" => /g' "$SPEC"
sed -i 's/    \([0-9]\+\) -> /    \1 => /g' "$SPEC"
sed -i 's/    true  -> /    true  => /g' "$SPEC"
sed -i 's/    false -> /    false => /g' "$SPEC"

# 8-space indented match arms (nested match in §18.11)
sed -i 's/        \.\(Lit\|Add\)(.*) -> /        .\1 => /g' "$SPEC"

# ============================================================
# S37-AM-003: Default arm _ -> else (only in match arm default position)
# ============================================================

# Default wildcard arms (4 spaces indent, just _ or _ with spaces)
sed -i 's/^    _              -> 0$/    else           => 0/' "$SPEC"
sed -i 's/^    _         -> handleOther()$/    else      => handleOther()/' "$SPEC"
sed -i 's/^    _ -> "unknown"$/    else => "unknown"/' "$SPEC"
sed -i 's/^    _        -> showUser()$/    else     => showUser()/' "$SPEC"
sed -i 's/^    _        -> handleOther()$/    else     => handleOther()/' "$SPEC"

# §18.6 section rewrite (handled below in Python heredoc section)
# These sed replacements handle the simple cases; the §18.6 full section rewrite
# requires the targeted section replacement below.

# §18.8.1: update normative text about wildcard
sed -i "s/- A \`_\` arm covers all remaining variants for the purpose of exhaustiveness\./- An \`else\` arm covers all remaining variants for the purpose of exhaustiveness./" "$SPEC"

# §18.8.1 match text
sed -i "s/OR when a \`_\` wildcard arm is present\./OR when an \`else\` arm is present./" "$SPEC"
sed -i "s/\`V ⊆ A\` or \`_\` is/\`V ⊆ A\` or \`else\` is/" "$SPEC"
sed -i "s/A = {::V1, ::V3, ...}/A = {.V1, .V3, ...}/" "$SPEC"

# §18.12 wildcard arm + lin text
sed -i "s/\*\*Wildcard arm and \`lin\` set consistency:\*\* The \`_\` arm is treated as an arm/**Default arm and \`lin\` set consistency:** The \`else\` arm is treated as an arm/" "$SPEC"
sed -i "s/All arms, including \`_\`, MUST consume/All arms, including \`else\`, MUST consume/" "$SPEC"
sed -i "s/If the \`_\` arm consumes a \`lin\` variable/If the \`else\` arm consumes a \`lin\` variable/" "$SPEC"

# §18.12 normative statement
sed -i "s/- All arms, including the \`_\` arm, MUST consume the same set of outer \`lin\` variables/- All arms, including the \`else\` arm, MUST consume the same set of outer \`lin\` variables/" "$SPEC"
sed -i "s/(§34.4). An arm that consumes a \`lin\` variable that another arm does not is E-LIN-003\./\n(§34.4). An arm that consumes a \`lin\` variable that another arm does not is E-LIN-003./" "$SPEC"

# §4.11.3: Wildcard arm keyword note
sed -i "s/\`is\` is a context-sensitive keyword valid only as an arm pattern keyword in match contexts (§18). In all other contexts, \`is\` is a valid identifier./\`is\` is a context-sensitive keyword valid in two positions:\n1. As the variant-check operator in a boolean expression: \`expression is .VariantName\`\n2. In a \`when\` guard: \`when expression is .VariantName { ... }\`\n\nIn all other contexts, \`is\` is a valid identifier./" "$SPEC"

# §4.11.3 normative statements
sed -i "s/- \`is\` SHALL be recognized as a keyword only in match arm pattern position./- \`is\` SHALL be recognized as a keyword in variant-check position: between an expression\n  and a \`.VariantName\` shorthand.\n- \`is\` SHALL be recognized as a keyword in \`when\` guard position./" "$SPEC"
sed -i "s/- The parser SHALL disambiguate \`is\` by context: inside a \`match\` expression's arm patterns, \`is\` is a keyword; elsewhere, it is an identifier./- The parser SHALL disambiguate \`is\` by context: after an expression that has an enum type,\n  \`is\` begins a variant check. Elsewhere, it is an identifier./" "$SPEC"

# §18.15 error table: update E-SYNTAX-010 and add new note
sed -i "s/| E-SYNTAX-011 | Guard clause syntax (\`if\` after arm pattern) — not supported in v1 | Error |/| E-SYNTAX-020 | \`->\` appears in match arm separator position | Error |\n| E-SYNTAX-021 | \`_\` in match arm default position (where \`else\` is required) | Error |\n| E-SYNTAX-011 | Guard clause syntax (\`if\` after arm pattern) — not supported in v1 | Error |/" "$SPEC"

# §18.16 literal match: update reference to `::`
sed -i "s/Arms for.*these types use literal values directly — no \`::\` sigil, no \`is\` keyword\./Arms for these types use literal values directly — no variant prefix sigil, no \`is\` keyword./" "$SPEC"
sed -i "s/literal arm not valid over enum type; use\n  \`::VariantName\` arm syntax/literal arm not valid over enum type; use\n  \`.VariantName\` arm syntax/g" "$SPEC"
sed -i "s/\`::VariantName\` arm syntax\.\`)/\`.VariantName\` arm syntax.\`)/g" "$SPEC"
sed -i "s/\`::Active ->\`/\`.Active =>\`/g" "$SPEC"

# §33 error table: update references
sed -i "s/| E-SYNTAX-010 | §18.6 | \`_\` wildcard arm is not the last arm | Error |/| E-SYNTAX-010 | §18.6 | \`else\` default arm is not the last arm | Error |/" "$SPEC"

# §8.3: update bun:sqlite passthrough text to note driver-specific behavior
# (This is a minor note; the normative addition is in §8.1.1 which is inserted below)

echo "Basic text substitutions applied."
echo "NOTE: Section insertions (§4.12, §8.1.1, §18.6 rewrite, new §23, new §33 entries) must be applied separately."
echo "See docs/changes/apply-spec-amendments/section-insertions.md for the full insertion content."
