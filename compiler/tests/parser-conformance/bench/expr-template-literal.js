// Bench: template literals — including ${} interpolation w/ bracket-balanced inner }.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
const a = 1;
const obj = { x: 2 };
const t1 = `plain`;
const t2 = `value ${a}`;
const t3 = `nested ${`inner ${a}`} outer`;
const t4 = `obj-access ${obj.x} done`;
const t5 = `block-balanced ${(() => { const v = a + 1; return v; })()} ok`;
const tagged = String.raw`raw\nstring`;
