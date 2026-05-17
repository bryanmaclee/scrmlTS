// Bench: literal expressions — numeric / string / template / regex / boolean / null.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
const a = 42;
const b = 3.14;
const c = 0xff;
const d = "hello";
const e = 'world';
const f = `tpl ${a} ${b}`;
const g = /foo.bar/i;
const h = true;
const i = false;
const j = null;
const k = 1_000_000n; // BigInt literal — ES2020
