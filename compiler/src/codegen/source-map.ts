/**
 * @module codegen/source-map
 *
 * Source Map v3 generator for scrml compiled output.
 * Maps output JS lines back to source .scrml lines.
 *
 * Implements Source Map v3: https://sourcemaps.info/spec.html
 * VLQ encoding per: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k
 *
 * No npm dependencies — VLQ is implemented inline (it's ~15 lines).
 *
 * Usage:
 *   const builder = new SourceMapBuilder("app.scrml");
 *   builder.addMapping(outputLine, sourceLine, sourceCol);
 *   const mapJson = builder.generate("app.client.js");
 *   const jsWithComment = appendSourceMappingUrl(jsCode, "app.client.js.map");
 */

// ---------------------------------------------------------------------------
// VLQ Base64 encoding
// ---------------------------------------------------------------------------

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode a single signed integer as a VLQ base64 string.
 *
 * VLQ encoding:
 *   1. Map signed integer to unsigned: negative n → (-n << 1) | 1, non-negative n → n << 1
 *   2. Chunk into 5-bit groups, LSB first
 *   3. Set continuation bit (bit 5) on all chunks except the last
 *   4. Base64-encode each 6-bit chunk (5 data bits + 1 continuation bit)
 */
export function encodeVlq(value: number): string {
  // Map signed to unsigned (sign bit in LSB)
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let result = "";
  do {
    let digit = vlq & 0x1F; // take 5 bits
    vlq >>>= 5;
    if (vlq > 0) digit |= 0x20; // set continuation bit if more to come
    result += BASE64_CHARS[digit];
  } while (vlq > 0);
  return result;
}

/**
 * Encode an array of signed integers as a single VLQ segment.
 */
export function encodeVlqGroup(values: number[]): string {
  return values.map(encodeVlq).join("");
}

// ---------------------------------------------------------------------------
// SourceMapBuilder
// ---------------------------------------------------------------------------

/** A single mapping entry: output line → source location. */
interface Mapping {
  outputLine: number;
  sourceLine: number;
  sourceCol: number;
}

/** Source Map v3 JSON structure. */
interface SourceMapV3 {
  version: 3;
  file: string;
  sourceRoot: string;
  sources: string[];
  sourcesContent: null;
  mappings: string;
}

/**
 * Build a Source Map v3 for a single generated output file.
 *
 * This implementation generates line-level mappings only — every output line
 * maps to a source line in the original .scrml file. Column precision is
 * deferred to a future phase (requires per-node span tracking in emitters).
 *
 * The mappings are delta-encoded as per the Source Map v3 spec:
 *   - outputCol is delta from previous segment in same line (reset per line)
 *   - sourceFileIndex is delta from previous segment
 *   - sourceLine is delta from previous segment
 *   - sourceCol is delta from previous segment
 */
export class SourceMapBuilder {
  private _sourceFile: string;
  private _mappings: Mapping[];

  /**
   * @param sourceFile — basename of the source .scrml file (e.g. "app.scrml")
   */
  constructor(sourceFile: string) {
    this._sourceFile = sourceFile;
    this._mappings = [];
  }

  /**
   * Record a mapping from an output line to a source location.
   *
   * @param outputLine — 0-indexed output JS line number
   * @param sourceLine — 0-indexed source .scrml line number
   * @param sourceCol — 0-indexed source column
   */
  addMapping(outputLine: number, sourceLine: number, sourceCol = 0): void {
    this._mappings.push({ outputLine, sourceLine, sourceCol });
  }

  /**
   * Generate the Source Map v3 JSON string.
   *
   * @param outputFile — basename of the generated JS file (e.g. "app.client.js")
   * @returns JSON string (the .map file content)
   */
  generate(outputFile: string): string {
    const mappings = this._buildMappingsField();
    const map: SourceMapV3 = {
      version: 3,
      file: outputFile,
      sourceRoot: "",
      sources: [this._sourceFile],
      sourcesContent: null,
      mappings,
    };
    return JSON.stringify(map, null, 2);
  }

  /**
   * Build the VLQ-encoded `mappings` string.
   *
   * Groups are output lines (separated by ";").
   * Each group contains comma-separated segments.
   * Each segment encodes: [outputCol, sourceFileIndex, sourceLine, sourceCol]
   * All fields are relative deltas (reset outputCol per line).
   */
  _buildMappingsField(): string {
    if (this._mappings.length === 0) return "";

    // Sort mappings by output line
    const sorted = [...this._mappings].sort((a, b) => a.outputLine - b.outputLine);

    // Find the highest output line number
    const maxOutputLine = sorted[sorted.length - 1].outputLine;

    // Build a map: outputLine → list of { sourceLine, sourceCol }
    const lineMap = new Map<number, Array<{ sourceLine: number; sourceCol: number }>>();
    for (const m of sorted) {
      if (!lineMap.has(m.outputLine)) lineMap.set(m.outputLine, []);
      lineMap.get(m.outputLine)!.push({ sourceLine: m.sourceLine, sourceCol: m.sourceCol });
    }

    // Delta state (relative to previous segment globally)
    let prevSourceLine = 0;
    let prevSourceCol = 0;
    // sourceFileIndex is always 0 (one source file), delta from previous = 0 after first segment

    const groups: string[] = [];
    let prevSourceFileIndex = 0;

    for (let lineIdx = 0; lineIdx <= maxOutputLine; lineIdx++) {
      const segments = lineMap.get(lineIdx);
      if (!segments || segments.length === 0) {
        // Empty group for this output line
        groups.push("");
        continue;
      }

      const segmentParts: string[] = [];
      let prevOutputCol = 0; // outputCol delta resets per line

      for (const seg of segments) {
        const outputColDelta = 0 - prevOutputCol; // always 0 for first segment per line
        const sourceFileIndexDelta = 0 - prevSourceFileIndex;
        const sourceLineDelta = seg.sourceLine - prevSourceLine;
        const sourceColDelta = seg.sourceCol - prevSourceCol;

        segmentParts.push(encodeVlqGroup([
          outputColDelta,
          sourceFileIndexDelta,
          sourceLineDelta,
          sourceColDelta,
        ]));

        prevOutputCol = 0; // column is 0, stays 0
        prevSourceFileIndex = 0;
        prevSourceLine = seg.sourceLine;
        prevSourceCol = seg.sourceCol;
      }

      groups.push(segmentParts.join(","));
    }

    return groups.join(";");
  }
}

// ---------------------------------------------------------------------------
// Utility: append sourceMappingURL comment
// ---------------------------------------------------------------------------

/**
 * Append a `//# sourceMappingURL=<file>` comment to a JS string.
 *
 * Per convention, this is the last line of the generated JS file.
 * If the code already ends with this comment (idempotent), it is not added again.
 *
 * @param jsCode — the generated JS string
 * @param mapFile — the basename of the .map file (e.g. "app.client.js.map")
 * @returns the JS with the comment appended
 */
export function appendSourceMappingUrl(jsCode: string, mapFile: string): string {
  const comment = `//# sourceMappingURL=${mapFile}`;
  // Idempotent — don't double-append
  if (jsCode.includes(comment)) return jsCode;
  // Ensure there's a newline before the comment
  const separator = jsCode.endsWith("\n") ? "" : "\n";
  return `${jsCode}${separator}${comment}\n`;
}
