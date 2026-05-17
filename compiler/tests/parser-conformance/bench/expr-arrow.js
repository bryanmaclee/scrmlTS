// Bench: arrow functions — concise + block body.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
const concise = (x) => x + 1;
const block = (x) => {
  const y = x * 2;
  return y + 1;
};
const noParen = x => x;
const empty = () => 0;
const multi = (a, b, c) => a + b + c;
const objReturn = () => ({ a: 1, b: 2 });
const asyncArrow = async (x) => await x;
