// Bench: destructuring patterns — object/array with defaults + rest.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
const { a, b, c = 3 } = { a: 1, b: 2 };
const { x: renamed, y: { nested } = {} } = { x: 1, y: { nested: 2 } };
const [first, second, ...rest] = [1, 2, 3, 4, 5];
const [, skipped] = [1, 2];
const { p, q, ...others } = { p: 1, q: 2, r: 3 };

function destructureParams({ a, b = 0 }, [first, ...tail]) {
  return a + b + first + tail.length;
}
