// Bench: function* + yield + yield*.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
// Generators back scrml SSE per §37.
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

async function* asyncStream() {
  yield await Promise.resolve(1);
  yield await Promise.resolve(2);
}
