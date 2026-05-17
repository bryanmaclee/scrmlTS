// Bench: import / export — named, default, namespace, re-export.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
import defaultThing from "./mod-a.js";
import { named1, named2 } from "./mod-b.js";
import { renamed as local } from "./mod-c.js";
import * as ns from "./mod-d.js";
import defaultAndNamed, { x, y } from "./mod-e.js";

export const A = 1;
export function fnExport() { return 2; }
export default class Klass {}
export { A as RenamedA };
export * from "./mod-f.js";
export { x } from "./mod-g.js";
