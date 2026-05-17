// Bench: optional chaining ?. + nullish coalescing ??.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
const a = { b: { c: { d: 1 } } };
const v1 = a?.b?.c?.d;
const v2 = a?.b?.missing?.x ?? "default";
const v3 = a?.["b"]?.c;
const v4 = a?.b?.fn?.();
const v5 = (a?.b ?? {}).c;
let x;
const v6 = x ?? 0;
