/** Source location span produced by the compiler parser stages. */
export interface CGSpan {
  file?: string;
  start: number;
  end: number;
  line?: number;
  col?: number;
  [key: string]: unknown;
}

export class CGError {
  code: string;
  message: string;
  span: CGSpan | object;
  severity: 'error' | 'warning';

  constructor(
    code: string,
    message: string,
    span: CGSpan | object,
    severity: 'error' | 'warning' = "error",
  ) {
    this.code = code;
    this.message = message;
    this.span = span;
    this.severity = severity;
  }
}

// ---------------------------------------------------------------------------
// E-TEST-* — Test context error codes
// ---------------------------------------------------------------------------
//
// E-TEST-001  Nested ~{} block — `~{}` cannot nest inside another `~{}` context.
//             Use separate `~{}` blocks or `test` sub-blocks within a single group.
//
// E-TEST-002  `~{}` in invalid position — test context is not valid inside `?{}`
//             SQL or `#{}` CSS contexts.
//
// E-TEST-003  `assert.type` with unknown type name — the type name following `:` is
//             not in the type registry for this file.
//
// E-TEST-004  `assert.throws` with non-callable expression — the expression passed
//             to `assert.throws` must be a function call or function literal.
//
// E-TEST-005  Empty test block — a `~{}` block with no test cases or assertions
//             produces no test output. This is a warning, not an error.
//             (severity: 'warning')
