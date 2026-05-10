import { compileScrml } from "../compiler/src/api.js";
import { writeFileSync } from "fs";

const result = compileScrml({ inputFiles: ["compiler/self-host/tab.scrml"], mode: "library", write: false });
const entry = result.outputs?.values()?.next()?.value;
if (entry?.libraryJs) {
  writeFileSync("compiler/self-host/dist/tab.js", entry.libraryJs);
  console.log("wrote tab.js:", entry.libraryJs.length, "bytes");
} else {
  console.log("no libraryJs");
  const errs = result.errors?.filter((e: any) => e.severity !== "warning") ?? [];
  console.log("errors:", errs.length);
  for (const e of errs.slice(0, 5)) console.log(" ", e.code, e.message);
}
