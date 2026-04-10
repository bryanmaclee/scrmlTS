// Variable naming — counter + generator
let _varCounter = 0;

export function genVar(baseName: string): string {
  _varCounter++;
  const safe = (baseName || "v").replace(/[^A-Za-z0-9_$]/g, "_");
  return `_scrml_${safe}_${_varCounter}`;
}

export function resetVarCounter(): void {
  _varCounter = 0;
}
