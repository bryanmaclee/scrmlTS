/**
 * I-MATCH-PROMOTABLE — info-level lint that surfaces if-else chains over
 * enum-typed state cells that are mechanically promotable to a `<match>` block.
 *
 * **Status:** S66 Tier B ship. Pairs with `bun scrml promote --match`.
 *
 * **Spec:** SPEC §56. Three message shapes (per §56.3):
 *   - exhaustive (clean lift available — every variant is covered)
 *   - near-miss (concrete missing-variants list)
 *   - compound-condition (advisory; chain has `||` / `&&` / negation; not
 *     auto-promotable — separate info per §56.4)
 *
 * **Predicate matrix (S66 narrowing):** the lint fires only on chains where
 * every branch's `condExpr` is a `binary` ExprNode with `op === "is"` whose
 * left is the same `@cell` ident across the chain. The other shapes named in
 * §56.2 (`@cell.is(.X)`, `@cell == .X`, bind-on-is) are not parseable as
 * structured AST today (predecessor S66 Phase 0 + sub-survey findings —
 * see docs/changes/promotion-ergonomics/SURVEY-PHASE-B.md and progress.md).
 *
 * **Pipeline placement:** runs as a post-TS pass invoked from api.js. Needs
 * `stateTypeRegistry` (built by `runTS`) plus the typed-AST. The B3 cell
 * resolution (`_resolvedStateCell` stamped on @ident expressions) provides
 * the cell record; cell.declNode.typeAnnotation gives the type name.
 *
 * **Output:** lint diagnostics in the standard shape (`{ line, column,
 * code, severity, message, ghost?, correction? }`) — fed into the
 * `allLintDiagnostics` channel by api.js.
 *
 * @module lint-i-match-promotable
 */

/**
 * Lint diagnostic shape returned to api.js.
 *
 * @typedef {{
 *   line: number,
 *   column: number,
 *   code: string,
 *   severity: "info"|"warning"|"error",
 *   message: string,
 *   ghost?: string,
 *   correction?: string,
 * }} LintDiagnostic
 */

/**
 * Walk the typed-AST and collect I-MATCH-PROMOTABLE diagnostics.
 *
 * @param {object[]} files — typed FileAST array from `runTS`
 * @param {Map<string, object>} stateTypeRegistry — type-name → ResolvedType
 * @returns {Array<LintDiagnostic & { filePath: string }>}
 */
export function runIMatchPromotable(files, stateTypeRegistry) {
  const diagnostics = [];
  if (!files || !Array.isArray(files) || !stateTypeRegistry) return diagnostics;

  for (const file of files) {
    const filePath = file.filePath || "";
    walkFileForIfChains(file, (chainHead, chainBranches) => {
      const diag = analyseChain(chainHead, chainBranches, stateTypeRegistry);
      if (diag) {
        diagnostics.push({ ...diag, filePath });
      }
    });
  }

  return diagnostics;
}

/**
 * Recursive AST walker that finds every TOP-LEVEL if-stmt and gathers its
 * else-if chain into an ordered list of branches. Nested if-stmts inside
 * branch bodies are walked recursively so they get their own analysis.
 *
 * @param {object} file — FileAST
 * @param {(head: object, branches: BranchInfo[]) => void} visitor
 */
function walkFileForIfChains(file, visitor) {
  const seen = new WeakSet();

  function visitNode(node) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (node.kind === "if-stmt" && !seen.has(node)) {
      // Gather the chain
      const branches = collectChainBranches(node);
      visitor(node, branches);
      // Walk INTO each branch body for nested chains
      for (const b of branches) {
        if (Array.isArray(b.consequent)) {
          for (const child of b.consequent) visitNode(child);
        }
      }
      // Walk into trailing-else body too
      const lastBranch = branches[branches.length - 1];
      if (lastBranch && lastBranch.trailingElse && Array.isArray(lastBranch.trailingElse)) {
        for (const child of lastBranch.trailingElse) visitNode(child);
      }
      return;
    }

    // Recurse into known structural fields
    for (const key of ["nodes", "consequent", "alternate", "body", "children", "arms",
      "componentBody", "expressions", "items"]) {
      const v = node[key];
      if (Array.isArray(v)) {
        for (const child of v) visitNode(child);
      }
    }
    // Components / function-decls have body arrays inside parameters etc; recurse
    if (Array.isArray(node.components)) {
      for (const c of node.components) visitNode(c);
    }
  }

  if (Array.isArray(file.nodes)) {
    for (const n of file.nodes) visitNode(n);
  }
  if (Array.isArray(file.components)) {
    for (const c of file.components) visitNode(c);
  }
}

/**
 * @typedef {{
 *   condExpr: object | null,   // the binary `is` expression, or null for trailing else
 *   consequent: object[],
 *   ifNode: object,            // the IfStmtNode this branch came from (for span/line)
 *   trailingElse: object[]|null  // populated only on the final virtual branch when a bare else exists
 * }} BranchInfo
 */

/**
 * Walk an if-stmt chain (else-if encoded as nested if-stmt in alternate)
 * and produce an ordered branch list.
 *
 * @param {object} head — the top IfStmtNode
 * @returns {BranchInfo[]}
 */
function collectChainBranches(head) {
  const branches = [];
  let cur = head;
  while (cur && cur.kind === "if-stmt") {
    branches.push({
      condExpr: cur.condExpr ?? null,
      consequent: Array.isArray(cur.consequent) ? cur.consequent : [],
      ifNode: cur,
      trailingElse: null,
    });

    const alt = cur.alternate;
    if (Array.isArray(alt) && alt.length === 1 && alt[0] && alt[0].kind === "if-stmt") {
      cur = alt[0];
    } else if (Array.isArray(alt) && alt.length > 0) {
      // Bare trailing else: attach to the LAST collected branch
      branches[branches.length - 1].trailingElse = alt;
      break;
    } else {
      break;
    }
  }
  return branches;
}

/**
 * Classify a chain and produce a diagnostic if it qualifies. Returns null for
 * chains the lint does not fire on (most chains).
 *
 * @param {object} chainHead — the top IfStmtNode
 * @param {BranchInfo[]} branches
 * @param {Map<string, object>} stateTypeRegistry
 * @returns {LintDiagnostic | null}
 */
function analyseChain(chainHead, branches, stateTypeRegistry) {
  if (branches.length < 2) return null;  // 1-branch chains aren't worth promoting

  // Phase 1: identify the leading-cell ident. Must be a uniform `binary op=is`
  // shape across all branches that have a condExpr. If any branch has compound
  // condition (logical-and/or, unary-not, ternary, etc.) we either skip or
  // emit a compound-condition advisory (for the case where the SHAPE looks
  // promotable but conditions are mixed-compound).
  let cellIdent = null;
  let cellName = null;
  let hasCompound = false;
  let hasMixedDiscriminator = false;
  let hasNonIsForm = false;
  const variantTags = [];

  for (const b of branches) {
    const ce = b.condExpr;
    if (!ce) continue;  // skip trailing-else; handled separately

    if (isCompoundCondition(ce)) {
      hasCompound = true;
      continue;
    }

    if (!isBareIsVariant(ce)) {
      hasNonIsForm = true;
      continue;
    }

    const branchCellName = identName(ce.left);
    if (cellName == null) {
      cellName = branchCellName;
      cellIdent = ce.left;
    } else if (cellName !== branchCellName) {
      hasMixedDiscriminator = true;
    }
    const tag = stripDotPrefix(identName(ce.right));
    if (tag) variantTags.push(tag);
  }

  // No structured `is` predicates found in the entire chain → not our concern.
  if (variantTags.length === 0) return null;

  // Compound-condition advisory: chain HAS `is`-form branches but ALSO has
  // compound branches mixed in. §56.4 — emit info, do not auto-promote.
  if (hasCompound) {
    return makeCompoundDiag(chainHead);
  }

  // Mixed-discriminator: chain has `is`-form branches but on different cells.
  // §56.2 #3 — does NOT fire I-MATCH-PROMOTABLE.
  if (hasMixedDiscriminator) return null;

  // Non-is forms (e.g., `if (x > 5)` mixed with `is`-form): not a clean
  // promotable site. Don't fire.
  if (hasNonIsForm) return null;

  // Resolve cell type via B3 stamp + typeAnnotation lookup.
  const enumType = resolveEnumTypeForCell(cellIdent, stateTypeRegistry);
  if (!enumType) return null;  // cell is not enum-typed; not our concern

  // Compute coverage.
  const allVariants = (enumType.variants ?? []).map(v => v.name);
  const allSet = new Set(allVariants);
  const coveredSet = new Set(variantTags);
  const missing = allVariants.filter(v => !coveredSet.has(v));
  const hasTrailingElse = branches.some(b => b.trailingElse !== null);

  if (missing.length === 0) {
    return makeExhaustiveDiag(chainHead, enumType.name, allVariants, cellName);
  } else if (hasTrailingElse) {
    // Chain with bare-else covering remaining variants. CLI cannot promote
    // mechanically (the else body would need to be split per missing variant
    // OR remain as a wildcard arm). Don't fire — user has handled it.
    return null;
  } else {
    return makeNearMissDiag(chainHead, enumType.name, allVariants, missing, cellName);
  }
}

/** True if expr is a binary `is`-op on a cell ident with a `.Variant` right. */
function isBareIsVariant(expr) {
  return (
    expr &&
    expr.kind === "binary" &&
    expr.op === "is" &&
    expr.left && (expr.left.kind === "ident") &&
    expr.right && (expr.right.kind === "ident") &&
    typeof expr.right.name === "string" &&
    expr.right.name.startsWith(".")
  );
}

/** True if expr involves a logical operator, negation, or compound shape. */
function isCompoundCondition(expr) {
  if (!expr) return false;
  if (expr.kind === "logical") return true;
  if (expr.kind === "unary" && expr.op === "!") return true;
  // a binary `&&` / `||` could be encoded as `binary` with logical op
  if (expr.kind === "binary" && (expr.op === "&&" || expr.op === "||")) return true;
  if (expr.kind === "ternary") return true;
  return false;
}

function identName(node) {
  return node && node.kind === "ident" ? node.name : null;
}

function stripDotPrefix(name) {
  if (typeof name !== "string") return null;
  return name.startsWith(".") ? name.slice(1) : name;
}

/**
 * Resolve a cell-ident expression to its declared EnumType (if any).
 * Uses B3's `_resolvedStateCell` annotation + the cell's typeAnnotation field.
 */
function resolveEnumTypeForCell(cellIdent, stateTypeRegistry) {
  if (!cellIdent) return null;
  const record = cellIdent._resolvedStateCell;
  if (!record || !record.declNode) return null;
  const typeName = record.declNode.typeAnnotation;
  if (!typeName || typeof typeName !== "string") return null;
  // Strip generic params if present (e.g., "Maybe<T>" → "Maybe"). Not relevant
  // for plain enums but defensive.
  const baseName = typeName.split(/[<\s(]/)[0].trim();
  const t = stateTypeRegistry.get(baseName);
  if (!t || t.kind !== "enum") return null;
  return t;
}

// ---------------------------------------------------------------------------
// Diagnostic builders
// ---------------------------------------------------------------------------

function spanLineCol(node) {
  // Prefer condExpr.span on the chain head's first branch; fall back to the
  // node's own span/line/col fields. The IfStmtNode has a BaseNode `span`
  // shape with file/start/end/line/col.
  if (node.span && typeof node.span.line === "number") {
    return { line: node.span.line, column: node.span.col ?? 1 };
  }
  if (typeof node.line === "number") {
    return { line: node.line, column: node.col ?? node.column ?? 1 };
  }
  return { line: 1, column: 1 };
}

function makeExhaustiveDiag(chainHead, enumName, allVariants, cellName) {
  const { line, column } = spanLineCol(chainHead);
  const cellLabel = cellName ?? "<cell>";
  const variantList = allVariants.map(v => `.${v}`).join(", ");
  const message =
    `Line ${line}: I-MATCH-PROMOTABLE — this if-else chain on \`${cellLabel}\` exhaustively ` +
    `covers ${enumName} (${variantList}). Run \`bun scrml promote --match <file>:${line}\` ` +
    `to mechanically lift the chain to a \`<match>\` block. See SPEC §56.`;
  return {
    line,
    column,
    code: "I-MATCH-PROMOTABLE",
    severity: "info",
    shape: "exhaustive",
    enumName,
    cellName: cellLabel,
    missing: [],
    message,
    ghost: `if-else over enum-typed @${cellLabel}: Phase`,
    correction: `<match for=${enumName} on=@${cellLabel}> ... </>`,
  };
}

function makeNearMissDiag(chainHead, enumName, allVariants, missing, cellName) {
  const { line, column } = spanLineCol(chainHead);
  const cellLabel = cellName ?? "<cell>";
  const covered = allVariants.filter(v => !missing.includes(v));
  const coveredList = covered.map(v => `.${v}`).join(", ");
  const missingList = missing.map(v => `.${v}`).join(", ");
  const message =
    `Line ${line}: I-MATCH-PROMOTABLE — this if-else chain on \`${cellLabel}\` covers ` +
    `${enumName} partially (${coveredList}). Missing ${missingList}. Add the missing ` +
    `arm${missing.length > 1 ? "s" : ""}, then run \`bun scrml promote --match <file>:${line}\` ` +
    `to convert. Once promoted, the compiler will catch any future variant-add at the ` +
    `\`<match>\` site automatically. See SPEC §56.`;
  return {
    line,
    column,
    code: "I-MATCH-PROMOTABLE",
    severity: "info",
    shape: "near-miss",
    enumName,
    cellName: cellLabel,
    missing,
    message,
    ghost: `if-else over enum-typed @${cellLabel} (incomplete coverage)`,
    correction: `add ${missingList} arm${missing.length > 1 ? "s" : ""}, then promote to <match>`,
  };
}

function makeCompoundDiag(chainHead) {
  const { line, column } = spanLineCol(chainHead);
  const message =
    `Line ${line}: I-MATCH-PROMOTABLE — this if-else chain has at least one branch with a ` +
    `compound condition (\`||\` / \`&&\` / negation). \`bun scrml promote --match\` cannot ` +
    `auto-promote compound-condition branches. Consider splitting them into separate arms ` +
    `with shared body, or using a guard pattern. See SPEC §56.4.`;
  return {
    line,
    column,
    code: "I-MATCH-PROMOTABLE",
    severity: "info",
    shape: "compound",
    message,
    ghost: `if-else over enum cell with compound branches`,
    correction: `split compound branches before promoting`,
  };
}
