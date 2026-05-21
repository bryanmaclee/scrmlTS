// Bench: arrow functions — concise + block body.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
//
// M4.3 — the prior `async (x) => await x` line was removed; scrml retracted
// source-level `async`/`await` (E-ASYNC-NOT-IN-SCRML / E-AWAIT-NOT-IN-SCRML).
// See compiler/tests/parser-conformance-stmt.test.js the M4.3 retraction
// describe block for the retraction surface.
const concise = (x) => x + 1;
const block = (x) => {
  const y = x * 2;
  return y + 1;
};
const noParen = x => x;
const empty = () => 0;
const multi = (a, b, c) => a + b + c;
const objReturn = () => ({ a: 1, b: 2 });
const composed = (f) => (g) => (x) => f(g(x));
