/**
 * Value-Native Map RUNTIME — Unit Tests (§59, map-arc phase-c D3)
 *
 * These tests call the `_scrml_*` map runtime helpers DIRECTLY — no parser /
 * codegen needed (D3 is testable in isolation). The helpers are extracted from
 * the assembled `core` + `equality` + `map` runtime chunks (the real shipped
 * bytes), so the tests also exercise chunk assembly + tree-shaking boundaries.
 *
 * Coverage:
 *   §A  _scrml_fnv1a — byte-identical to the compile-time TS reference
 *   §B  _scrml_value_canonical — hash-consistency keystone (§59.5):
 *       field-order independence (structs / enums), arrays, the pinned
 *       primitive edge cases (1 vs 1.0, -0 vs 0, strings with delimiter chars,
 *       not/null/undefined)
 *   §C  method surface — from_entries/get/has/get_or/insert/remove/update/
 *       insert_all/size/keys/values/entries/sorted/sorted_by; MISS -> null;
 *       stored `not` distinguished from absence via .has
 *   §D  entries() element is a { key, value } STRUCT; keys/values/entries
 *       positional correspondence (§59.8)
 *   §E  @ordered insertion-order preserved incl. the JS-numeric-key trap;
 *       unordered default does not crash on integer keys
 *   §F  codec round-trip (incl. a stored-`not` via the §57 envelope)
 *   §G  map == order-independent (and @ordered maps equal regardless of
 *       insertion order); map-vs-non-map == is false (no crash)
 *   §H  chunk wiring — map helpers present, tree-shaken when absent
 */

import { describe, test, expect } from "bun:test";
import { assembleRuntime } from "../../src/codegen/runtime-chunks.ts";
import { fnv1aHash } from "../../src/codegen/fnv1a-hash.ts";

// Build a sandbox exposing every map helper + structural-eq, evaluated from the
// REAL assembled runtime chunks (core + equality + map).
function buildMapRuntime() {
  const asm = assembleRuntime(new Set(["core", "equality", "map"]));
  const factory = new Function(
    asm +
      "\nreturn {" +
      "fnv1a: _scrml_fnv1a," +
      "canon: _scrml_value_canonical," +
      "fromEntries: _scrml_map_from_entries," +
      "get: _scrml_map_get," +
      "has: _scrml_map_has," +
      "getOr: _scrml_map_get_or," +
      "insert: _scrml_map_insert," +
      "remove: _scrml_map_remove," +
      "update: _scrml_map_update," +
      "insertAll: _scrml_map_insert_all," +
      "size: _scrml_map_size," +
      "keys: _scrml_map_keys," +
      "values: _scrml_map_values," +
      "entries: _scrml_map_entries," +
      "sorted: _scrml_map_sorted," +
      "sortedBy: _scrml_map_sorted_by," +
      "encode: _scrml_map_encode," +
      "decode: _scrml_map_decode," +
      "eq: _scrml_structural_eq" +
      "};"
  );
  return factory();
}

const rt = buildMapRuntime();

// ---------------------------------------------------------------------------
// §A — _scrml_fnv1a byte-identical to the compile-time TS reference
// ---------------------------------------------------------------------------

describe("§A _scrml_fnv1a — FNV-1a-32 (§47.1.3 / §59.5)", () => {
  test("§A1 byte-identical to compile-time fnv1aHash across sample inputs", () => {
    for (const s of ["", "hello", "DAL-001", "s5:hello", "n42", "S{1:a n1}", "café", "ÿ"]) {
      expect(rt.fnv1a(s)).toBe(fnv1aHash(s));
    }
  });

  test("§A2 output is an 8-char base36 string (zero-padded)", () => {
    const h = rt.fnv1a("x");
    expect(h.length).toBe(8);
    expect(/^[0-9a-z]{8}$/.test(h)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B — _scrml_value_canonical: the hash-consistency keystone (§59.5)
// ---------------------------------------------------------------------------

describe("§B _scrml_value_canonical — value-canonical string (§59.5)", () => {
  test("§B1 struct field order is irrelevant (alpha-sort)", () => {
    expect(rt.canon({ a: 1, b: 2 })).toBe(rt.canon({ b: 2, a: 1 }));
    expect(rt.canon({ z: 9, m: 5, a: 1 })).toBe(rt.canon({ a: 1, z: 9, m: 5 }));
  });

  test("§B2 nested struct field order is irrelevant (deep alpha-sort)", () => {
    expect(rt.canon({ outer: { a: 1, b: 2 }, x: 3 })).toBe(
      rt.canon({ x: 3, outer: { b: 2, a: 1 } })
    );
  });

  test("§B3 enum tag + payload order is irrelevant", () => {
    expect(rt.canon({ _tag: "Point", x: 1, y: 2 })).toBe(
      rt.canon({ _tag: "Point", y: 2, x: 1 })
    );
  });

  test("§B4 enum unit variant (no payload)", () => {
    expect(rt.canon({ _tag: "Red" })).toBe(rt.canon({ _tag: "Red" }));
    expect(rt.canon({ _tag: "Red" })).not.toBe(rt.canon({ _tag: "Blue" }));
  });

  test("§B5 different enum tags differ", () => {
    expect(rt.canon({ _tag: "A", v: 1 })).not.toBe(rt.canon({ _tag: "B", v: 1 }));
  });

  test("§B6 arrays are element-ordered (order is significant)", () => {
    expect(rt.canon([1, 2, 3])).toBe(rt.canon([1, 2, 3]));
    expect(rt.canon([1, 2, 3])).not.toBe(rt.canon([3, 2, 1]));
  });

  test("§B7 number: 1 vs 1.0 vs 1e0 collapse (JS-canonical)", () => {
    expect(rt.canon(1)).toBe(rt.canon(1.0));
    expect(rt.canon(1)).toBe(rt.canon(1e0));
    expect(rt.canon(100)).toBe(rt.canon(1e2));
  });

  test("§B8 number: -0 normalizes to 0", () => {
    expect(rt.canon(-0)).toBe(rt.canon(0));
    expect(rt.canon(-0)).toBe("n0");
  });

  test("§B9 distinct numbers differ; number vs string-of-number differ", () => {
    expect(rt.canon(1)).not.toBe(rt.canon(2));
    expect(rt.canon(5)).not.toBe(rt.canon("5"));
  });

  test("§B10 string length-prefix defuses delimiter-char collisions", () => {
    // Without length-prefixing, these two struct-shapes could collide. The
    // length prefix makes content (incl. ':', '{', '}', ',') unambiguous.
    expect(rt.canon({ a: "b:1,c", d: "" })).not.toBe(rt.canon({ a: "b", "1,c": "", d: "" }));
    // A string containing the absence token "0:" is NOT confused with `not`.
    expect(rt.canon("0:")).not.toBe(rt.canon(null));
    expect(rt.canon("0:")).toBe("s2:0:");
  });

  test("§B11 boolean distinct from numbers/strings", () => {
    expect(rt.canon(true)).toBe("b1");
    expect(rt.canon(false)).toBe("b0");
    expect(rt.canon(true)).not.toBe(rt.canon(1));
    expect(rt.canon(false)).not.toBe(rt.canon(0));
  });

  test("§B12 not / null / undefined all canonicalize identically", () => {
    expect(rt.canon(null)).toBe(rt.canon(undefined));
    expect(rt.canon(null)).toBe("0:");
  });

  test("§B13 empty string is a DEFINED value, distinct from absence (S89)", () => {
    expect(rt.canon("")).not.toBe(rt.canon(null));
    expect(rt.canon("")).toBe("s0:");
  });
});

// ---------------------------------------------------------------------------
// §C — method surface
// ---------------------------------------------------------------------------

describe("§C map method surface — all PURE / clone-on-write (§59.7)", () => {
  test("§C1 from_entries + get + size + has", () => {
    const m = rt.fromEntries([["DAL", 3], ["HOU", 5]], false);
    expect(rt.size(m)).toBe(2);
    expect(rt.get(m, "DAL")).toBe(3);
    expect(rt.has(m, "DAL")).toBe(true);
    expect(rt.has(m, "NOPE")).toBe(false);
  });

  test("§C2 get MISS returns null (the `not` sentinel — NOT undefined)", () => {
    const m = rt.fromEntries([["DAL", 3]], false);
    expect(rt.get(m, "MISS")).toBe(null);
    expect(rt.get(m, "MISS")).not.toBe(undefined);
  });

  test("§C3 get composes with given/is-some semantics (!== null && !== undefined)", () => {
    const m = rt.fromEntries([["k", 0]], false);
    // stored 0 is a DEFINED value — present
    const v = rt.get(m, "k");
    expect(v !== null && v !== undefined).toBe(true);
    // miss is absent
    const miss = rt.get(m, "x");
    expect(miss !== null && miss !== undefined).toBe(false);
  });

  test("§C4 insert is pure — original map unchanged, new map has the entry", () => {
    const m0 = rt.fromEntries([["a", 1]], false);
    const m1 = rt.insert(m0, "b", 2);
    expect(rt.size(m0)).toBe(1); // original untouched
    expect(rt.get(m0, "b")).toBe(null);
    expect(rt.size(m1)).toBe(2);
    expect(rt.get(m1, "b")).toBe(2);
  });

  test("§C5 insert overwrites existing key (last-wins)", () => {
    const m = rt.insert(rt.fromEntries([["a", 1]], false), "a", 99);
    expect(rt.get(m, "a")).toBe(99);
    expect(rt.size(m)).toBe(1);
  });

  test("§C6 remove drops a key; no-op when absent; pure", () => {
    const m0 = rt.fromEntries([["a", 1], ["b", 2]], false);
    const m1 = rt.remove(m0, "a");
    expect(rt.has(m1, "a")).toBe(false);
    expect(rt.has(m0, "a")).toBe(true); // original untouched
    const m2 = rt.remove(m0, "zzz"); // no-op
    expect(rt.size(m2)).toBe(2);
  });

  test("§C7 update upserts — fn receives current value or not", () => {
    const m0 = rt.fromEntries([["a", 10]], false);
    const m1 = rt.update(m0, "a", (cur) => (cur === null ? 0 : cur) + 5);
    expect(rt.get(m1, "a")).toBe(15);
    // upsert on a missing key — fn receives null (`not`)
    const m2 = rt.update(m0, "new", (cur) => (cur === null ? 1 : cur + 1));
    expect(rt.get(m2, "new")).toBe(1);
  });

  test("§C8 get_or returns fallback on miss, value on hit", () => {
    const m = rt.fromEntries([["a", 1]], false);
    expect(rt.getOr(m, "a", 99)).toBe(1);
    expect(rt.getOr(m, "x", 99)).toBe(99);
  });

  test("§C9 insert_all bulk-merges another map (last-wins on collision)", () => {
    const a = rt.fromEntries([["x", 1], ["y", 2]], false);
    const b = rt.fromEntries([["y", 20], ["z", 30]], false);
    const merged = rt.insertAll(a, b);
    expect(rt.size(merged)).toBe(3);
    expect(rt.get(merged, "x")).toBe(1);
    expect(rt.get(merged, "y")).toBe(20); // b wins
    expect(rt.get(merged, "z")).toBe(30);
    expect(rt.size(a)).toBe(2); // original untouched
  });

  test("§C10 stored `not` value is distinguished from absence via .has", () => {
    const m = rt.insert(rt.fromEntries([], false), "k", null);
    // both a stored-not and an absent key read as null...
    expect(rt.get(m, "k")).toBe(null);
    expect(rt.get(m, "absent")).toBe(null);
    // ...but .has is the disambiguator (§59.6)
    expect(rt.has(m, "k")).toBe(true);
    expect(rt.has(m, "absent")).toBe(false);
    expect(rt.size(m)).toBe(1);
  });

  test("§C11 .remove() does NOT remove a stored `not` value (M6 — =not is not remove)", () => {
    const m = rt.insert(rt.fromEntries([], false), "k", null);
    // the key with a stored-not value is still present until explicitly removed
    expect(rt.has(m, "k")).toBe(true);
    const removed = rt.remove(m, "k");
    expect(rt.has(removed, "k")).toBe(false);
  });

  test("§C12 struct keys work — structural == is key-identity (§59.4)", () => {
    const m = rt.insert(rt.fromEntries([], false), { lane: "DAL", carrier: "ACME" }, 4500);
    // a structurally-equal struct (different field ORDER) is the SAME key
    expect(rt.get(m, { carrier: "ACME", lane: "DAL" })).toBe(4500);
    expect(rt.has(m, { lane: "DAL", carrier: "ACME" })).toBe(true);
    expect(rt.get(m, { lane: "HOU", carrier: "ACME" })).toBe(null);
  });

  test("§C13 sorted returns entries stabilized by canonical key string", () => {
    const m = rt.fromEntries([["c", 3], ["a", 1], ["b", 2]], false);
    const s = rt.sorted(m);
    expect(s.map((e) => e.key)).toEqual(["a", "b", "c"]);
    expect(s.map((e) => e.value)).toEqual([1, 2, 3]);
  });

  test("§C14 sorted_by uses a user comparator over entry structs", () => {
    const m = rt.fromEntries([["a", 3], ["b", 1], ["c", 2]], false);
    const s = rt.sortedBy(m, (x, y) => x.value - y.value);
    expect(s.map((e) => e.value)).toEqual([1, 2, 3]);
  });

  test("§C15 empty-map literal [:] is a valid empty map", () => {
    const m = rt.fromEntries([], false);
    expect(rt.size(m)).toBe(0);
    expect(rt.keys(m)).toEqual([]);
    expect(rt.get(m, "anything")).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// §D — entries() struct shape + positional correspondence (§59.8)
// ---------------------------------------------------------------------------

describe("§D iteration views — { key, value } struct + positional correspondence", () => {
  test("§D1 .entries() element is a { key, value } STRUCT (S169 ruling — not a tuple)", () => {
    const m = rt.fromEntries([["DAL", 3]], false);
    const e = rt.entries(m)[0];
    expect(e).toEqual({ key: "DAL", value: 3 });
    expect(Array.isArray(e)).toBe(false); // NOT a [k, v] tuple
    expect("key" in e && "value" in e).toBe(true);
  });

  test("§D2 keys()/values()/entries() share one ordering (positional correspondence)", () => {
    const m = rt.fromEntries([["a", 1], ["b", 2], ["c", 3]], false);
    const keys = rt.keys(m);
    const values = rt.values(m);
    const entries = rt.entries(m);
    expect(keys.length).toBe(values.length);
    expect(keys.length).toBe(entries.length);
    for (let i = 0; i < keys.length; i++) {
      expect(entries[i].key).toBe(keys[i]);
      expect(entries[i].value).toBe(values[i]);
    }
  });

  test("§D3 keys/values are [KeyT] / [ValT] arrays", () => {
    const m = rt.fromEntries([["a", 1], ["b", 2]], false);
    const keys = rt.keys(m).slice().sort();
    expect(keys).toEqual(["a", "b"]);
    const values = rt.values(m).slice().sort();
    expect(values).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// §E — @ordered insertion-order + the JS-numeric-key trap (§59.8)
// ---------------------------------------------------------------------------

describe("§E @ordered insertion order (§59.8) — the JS numeric-key trap", () => {
  test("§E1 @ordered preserves string-key insertion order", () => {
    const m = rt.fromEntries([["c", 1], ["a", 2], ["b", 3]], true);
    expect(rt.keys(m)).toEqual(["c", "a", "b"]);
  });

  test("§E2 @ordered preserves INTEGER-key insertion order (the trap)", () => {
    // JS objects iterate integer-like keys in NUMERIC order — an unordered map
    // would silently reorder these. @ordered uses the explicit `order` sidecar.
    const m = rt.fromEntries([[3, "three"], [1, "one"], [2, "two"]], true);
    expect(rt.keys(m)).toEqual([3, 1, 2]);
    expect(rt.values(m)).toEqual(["three", "one", "two"]);
  });

  test("§E3 @ordered insert appends new keys; overwrite keeps position", () => {
    let m = rt.fromEntries([["a", 1], ["b", 2]], true);
    m = rt.insert(m, "c", 3); // new key -> appended
    expect(rt.keys(m)).toEqual(["a", "b", "c"]);
    m = rt.insert(m, "a", 99); // overwrite -> position preserved
    expect(rt.keys(m)).toEqual(["a", "b", "c"]);
    expect(rt.get(m, "a")).toBe(99);
  });

  test("§E4 @ordered remove drops the key from the order sidecar too", () => {
    let m = rt.fromEntries([["a", 1], ["b", 2], ["c", 3]], true);
    m = rt.remove(m, "b");
    expect(rt.keys(m)).toEqual(["a", "c"]);
  });

  test("§E5 unordered default does NOT crash on integer keys", () => {
    const m = rt.fromEntries([[3, "x"], [1, "y"], [2, "z"]], false);
    expect(rt.size(m)).toBe(3);
    expect(rt.get(m, 1)).toBe("y");
    expect(rt.get(m, 3)).toBe("x");
    // keys present (order unspecified)
    expect(rt.keys(m).slice().sort()).toEqual([1, 2, 3]);
  });

  test("§E6 @ordered insert_all appends other's keys in other's iteration order", () => {
    const a = rt.fromEntries([["x", 1]], true);
    const b = rt.fromEntries([["z", 3], ["y", 2]], true);
    const merged = rt.insertAll(a, b);
    expect(rt.keys(merged)).toEqual(["x", "z", "y"]);
  });
});

// ---------------------------------------------------------------------------
// §F — lossless codec round-trip (§59.10)
// ---------------------------------------------------------------------------

describe("§F codec round-trip (§59.10)", () => {
  test("§F1 encode/decode round-trips a primitive-key map", () => {
    const m = rt.fromEntries([["DAL", 3], ["HOU", 5]], false);
    const back = rt.decode(rt.encode(m));
    expect(rt.eq(m, back)).toBe(true);
    expect(rt.get(back, "DAL")).toBe(3);
  });

  test("§F2 encode is JSON-safe (raw JS Map would JSON.stringify to {})", () => {
    const m = rt.fromEntries([["a", 1]], false);
    const enc = rt.encode(m);
    const json = JSON.stringify(enc);
    const back = rt.decode(JSON.parse(json));
    expect(rt.eq(m, back)).toBe(true);
  });

  test("§F3 stored `not` round-trips via the §57 absence-envelope (preserved distinct from absence)", () => {
    const m = rt.insert(rt.fromEntries([["x", 1]], false), "k", null);
    const enc = rt.encode(m);
    // the §57 envelope is used at the value leaf
    const kEntry = enc.entries.find((p) => p[0] === "k");
    expect(kEntry[1]).toEqual({ __scrml_absent: true });
    const back = rt.decode(JSON.parse(JSON.stringify(enc)));
    expect(rt.has(back, "k")).toBe(true); // present...
    expect(rt.get(back, "k")).toBe(null); // ...with a stored-not value
    expect(rt.get(back, "x")).toBe(1);
  });

  test("§F4 @ordered FLAG survives the codec; iteration order becomes canonical (not insertion)", () => {
    // Design call (§59.9 + §59.10): the wire format is "canonically ordered for
    // STABILITY" (§59.10) — two ==-equal maps MUST encode to identical bytes.
    // @ordered governs ITERATION, not EQUALITY (§59.9: == ignores order), so
    // insertion order is NOT part of the map's VALUE. Preserving insertion order
    // across the wire would break bit-stability (two ==-equal @ordered maps with
    // different insertion order would encode differently). Therefore the codec
    // canonically reorders: the `ordered` FLAG round-trips (the decoded map stays
    // @ordered for FUTURE inserts), but its post-decode iteration order is the
    // canonical key order. This is lossless at the VALUE level (== holds).
    const m = rt.fromEntries([[3, "c"], [1, "a"], [2, "b"]], true);
    const enc = rt.encode(m);
    expect(enc.ordered).toBe(true); // flag preserved
    const back = rt.decode(JSON.parse(JSON.stringify(enc)));
    expect(rt.eq(m, back)).toBe(true); // VALUE-lossless (== holds)
    // iteration order is now canonical (1, 2, 3), not insertion (3, 1, 2)
    expect(rt.keys(back)).toEqual([1, 2, 3]);
    // and a future insert still appends (the map is still @ordered)
    const back2 = rt.insert(back, 0, "z");
    expect(rt.keys(back2)).toEqual([1, 2, 3, 0]);
  });

  test("§F4b bit-stability: two ==-equal @ordered maps (diff insertion order) encode identically", () => {
    const a = rt.fromEntries([[3, "c"], [1, "a"], [2, "b"]], true);
    const b = rt.fromEntries([[1, "a"], [2, "b"], [3, "c"]], true);
    expect(rt.eq(a, b)).toBe(true);
    expect(JSON.stringify(rt.encode(a))).toBe(JSON.stringify(rt.encode(b)));
  });

  test("§F5 encoded entries are canonically ordered (bit-stable)", () => {
    const m1 = rt.fromEntries([["c", 3], ["a", 1], ["b", 2]], false);
    const m2 = rt.fromEntries([["b", 2], ["c", 3], ["a", 1]], false);
    // same entries, different construction order -> identical encoded JSON
    expect(JSON.stringify(rt.encode(m1))).toBe(JSON.stringify(rt.encode(m2)));
  });

  test("§F6 decode passes a non-encoded value through unchanged", () => {
    expect(rt.decode(42)).toBe(42);
    expect(rt.decode("x")).toBe("x");
  });

  test("§F7 struct-key map round-trips (key value preserved in entries array)", () => {
    const m = rt.insert(rt.fromEntries([], false), { lane: "DAL" }, 4500);
    const back = rt.decode(JSON.parse(JSON.stringify(rt.encode(m))));
    expect(rt.get(back, { lane: "DAL" })).toBe(4500);
  });
});

// ---------------------------------------------------------------------------
// §G — map == order-independent + map-vs-non-map (§59.9)
// ---------------------------------------------------------------------------

describe("§G map == — structural, order-independent (§59.9)", () => {
  test("§G1 unordered maps == regardless of construction order", () => {
    const a = rt.fromEntries([["a", 1], ["b", 2]], false);
    const b = rt.fromEntries([["b", 2], ["a", 1]], false);
    expect(rt.eq(a, b)).toBe(true);
  });

  test("§G2 @ordered maps == regardless of insertion order (== ignores order)", () => {
    const a = rt.fromEntries([["a", 1], ["b", 2]], true);
    const b = rt.fromEntries([["b", 2], ["a", 1]], true);
    expect(rt.eq(a, b)).toBe(true);
  });

  test("§G3 an @ordered map == an unordered map with the same entries", () => {
    const ordered = rt.fromEntries([["a", 1], ["b", 2]], true);
    const unordered = rt.fromEntries([["b", 2], ["a", 1]], false);
    expect(rt.eq(ordered, unordered)).toBe(true);
  });

  test("§G4 different values -> not equal", () => {
    const a = rt.fromEntries([["a", 1], ["b", 2]], false);
    const c = rt.fromEntries([["a", 1], ["b", 99]], false);
    expect(rt.eq(a, c)).toBe(false);
  });

  test("§G5 different key set / size -> not equal", () => {
    const a = rt.fromEntries([["a", 1], ["b", 2]], false);
    const d = rt.fromEntries([["a", 1]], false);
    expect(rt.eq(a, d)).toBe(false);
    const e = rt.fromEntries([["a", 1], ["c", 2]], false);
    expect(rt.eq(a, e)).toBe(false);
  });

  test("§G6 maps with structurally-equal struct VALUES are == (deep)", () => {
    const a = rt.fromEntries([["k", { x: 1, y: 2 }]], false);
    const b = rt.fromEntries([["k", { y: 2, x: 1 }]], false);
    expect(rt.eq(a, b)).toBe(true);
  });

  test("§G7 map vs non-map == is false and does NOT crash (typer fires E-EQ-001 at compile)", () => {
    const m = rt.fromEntries([["a", 1]], false);
    expect(rt.eq(m, [1, 2])).toBe(false);
    expect(rt.eq(m, { a: 1 })).toBe(false);
    expect(rt.eq(m, 5)).toBe(false);
    expect(rt.eq(m, "x")).toBe(false);
    expect(rt.eq(m, null)).toBe(false);
    // and the reverse
    expect(rt.eq([1, 2], m)).toBe(false);
    expect(rt.eq(5, m)).toBe(false);
  });

  test("§G8 nested-map values compare structurally", () => {
    const a = rt.fromEntries([["outer", rt.fromEntries([["inner", 1]], false)]], false);
    const b = rt.fromEntries([["outer", rt.fromEntries([["inner", 1]], false)]], false);
    expect(rt.eq(a, b)).toBe(true);
    const c = rt.fromEntries([["outer", rt.fromEntries([["inner", 2]], false)]], false);
    expect(rt.eq(a, c)).toBe(false);
  });

  test("§G9 non-map structural equality is UNCHANGED by the new map branch", () => {
    expect(rt.eq({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(rt.eq([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(rt.eq({ _tag: "X", v: 1 }, { _tag: "X", v: 1 })).toBe(true);
    expect(rt.eq({ a: 1 }, { a: 2 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §H — chunk wiring
// ---------------------------------------------------------------------------

describe("§H chunk wiring (tree-shaking)", () => {
  test("§H1 map chunk contains all map helpers", () => {
    const asm = assembleRuntime(new Set(["core", "map"]));
    for (const n of [
      "_scrml_fnv1a", "_scrml_value_canonical", "_scrml_map_from_entries",
      "_scrml_map_get", "_scrml_map_has", "_scrml_map_get_or", "_scrml_map_insert",
      "_scrml_map_remove", "_scrml_map_update", "_scrml_map_insert_all",
      "_scrml_map_size", "_scrml_map_keys", "_scrml_map_values", "_scrml_map_entries",
      "_scrml_map_sorted", "_scrml_map_sorted_by", "_scrml_map_encode", "_scrml_map_decode",
    ]) {
      expect(asm).toContain("function " + n + "(");
    }
  });

  test("§H2 map helpers are tree-shaken when the map chunk is absent", () => {
    const asm = assembleRuntime(new Set(["core"]));
    expect(asm).not.toContain("function _scrml_map_get(");
    expect(asm).not.toContain("function _scrml_value_canonical(");
  });

  test("§H3 the map == branch lives in `equality`, not `map`", () => {
    const eqOnly = assembleRuntime(new Set(["core", "equality"]));
    expect(eqOnly).toContain("a.__scrml_map === true");
    const mapOnly = assembleRuntime(new Set(["core", "map"]));
    expect(mapOnly).not.toContain("function _scrml_structural_eq(");
  });
});
