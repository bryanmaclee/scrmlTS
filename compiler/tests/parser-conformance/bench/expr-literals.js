// Bench: literal expressions — numeric / string / template / regex / boolean.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
//
// M4.3 — scrml has no `null` and no `undefined`; `not` is the single absence
// value (SPEC §42). Acorn parses `null`/`undefined` but the native parser
// reaches E-EXPR-UNEXPECTED on `null` (it is not in the JS-subset that scrml
// adopts — scrml carries `not` instead). The `null` / `undefined` lines were
// removed; the rest of the JS-literal surface is preserved.
const a = 42;
const b = 3.14;
const c = 0xff;
const d = "hello";
const e = 'world';
const f = `tpl ${a} ${b}`;
const g = /foo.bar/i;
const h = true;
const i = false;
const k = 1_000_000n; // BigInt literal — ES2020
