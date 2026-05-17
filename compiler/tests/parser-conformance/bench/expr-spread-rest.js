// Bench: spread + rest in literals and params.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
const a = [1, 2, 3];
const b = [...a, 4, 5];
const c = [...a, ...b];
const obj = { x: 1 };
const merged = { ...obj, y: 2 };
const both = { ...obj, ...merged, z: 3 };

function variadic(first, ...rest) {
  return first + rest.length;
}

const result = variadic(...a);

function objParam({ x, ...others }) {
  return { x, count: Object.keys(others).length };
}
