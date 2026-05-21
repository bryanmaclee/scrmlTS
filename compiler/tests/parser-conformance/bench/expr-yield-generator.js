// Bench: function* + yield + yield*.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
// Generators back scrml SSE per §37.
//
// M4.3 — the prior `async function*` + `await` fragment was removed; scrml
// retracted source-level `async`/`await` (E-ASYNC-NOT-IN-SCRML /
// E-AWAIT-NOT-IN-SCRML). Generators (`yield`/`yield*`/`function*`) are
// PRESERVED — see compiler/tests/parser-conformance-stmt.test.js the M4.1
// generator-only corpus + the M4.3 retraction describe block.
function* range(start, end) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

function* combined() {
  yield 0;
  yield* range(1, 4);
  yield 100;
}
