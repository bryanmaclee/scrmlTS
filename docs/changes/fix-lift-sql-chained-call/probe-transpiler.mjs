// Test if Bun.Transpiler can parse the server.js
const goodJs = `
import { foo } from 'bar';
export async function handler(req) {
  return await sql\`SELECT 1\`;
}
`;

const badJs = `
import { foo } from 'bar';
export async function handler(req) {
  return null;
  . all ( );
}
`;

const t = new Bun.Transpiler({ loader: "js" });

console.log("Good JS scan:");
try {
  t.scan(goodJs);
  console.log("PASSED");
} catch (e) {
  console.log("THREW:", e.message);
}

console.log("\nBad JS scan:");
try {
  t.scan(badJs);
  console.log("PASSED (no throw — which means scan doesn't catch parse errors)");
} catch (e) {
  console.log("THREW:", e.message);
}

console.log("\nGood JS transformSync:");
try {
  t.transformSync(goodJs);
  console.log("PASSED");
} catch (e) {
  console.log("THREW:", e.message);
}

console.log("\nBad JS transformSync:");
try {
  t.transformSync(badJs);
  console.log("PASSED (no throw)");
} catch (e) {
  console.log("THREW:", e.message);
}
