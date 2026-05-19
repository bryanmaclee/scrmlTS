// scrml:data — runtime shim
//
// Hand-written ES module that mirrors the semantics declared in
// stdlib/data/{transform,validate,parse,messages}.scrml. Used by the
// compiler's stdlib bundler (compiler/src/api.js — bundleStdlibForRun)
// for the server emission path, AND inlined into the shared scrml-
// runtime.js client emission path via the `_scrml_stdlib.data` registry
// chunk (compiler/src/runtime-template.js).
//
// This shim replaces the would-be compiled output of stdlib/data/*.scrml
// because those source files use scrml-native vocabulary (`is some`,
// `is not`, `not` literal) which the standard compile pipeline does not
// lower into the same JS shape these utility functions need today.
// Mirrors the convention established by stdlib/auth.js + crypto.js +
// host.js + store.js.
//
// Surface (must match stdlib/data re-exports):
//
//   from transform.scrml:
//     pick, omit, mapKeys, mapValues, groupBy, indexBy, sortBy, unique,
//     flatten, flattenDeep, chunk, toSnakeCase, toCamelCase,
//     camelizeKeys, snakifyKeys, deepMerge, clamp, paginate
//
//   from validate.scrml:
//     validate, isValid, firstError, required, email, minLength,
//     maxLength, exactLength, pattern, min, max, numeric, integer,
//     matches, oneOf, url, custom, emailField, passwordField,
//     passwordConfirmField
//
//   from parse.scrml:
//     parseVariant (defensive fallback; compile-time monomorphized by CG)
//
//   from messages.scrml:
//     registerMessages, messageFor (thin wrappers; delegate to runtime
//     helpers _scrml_messages_register / _scrml_message_for)
//
//   from form-for.scrml:
//     formFor (defensive fallback; compile-time rewritten by TS stage),
//     registerLabels (thin wrapper; delegates to runtime helper
//     _scrml_labels_register)

// ---------------------------------------------------------------------------
// transform.scrml — data transformation utilities (pure, browser-safe)
// ---------------------------------------------------------------------------

export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omit(obj, keys) {
  const keySet = new Set(keys);
  const result = {};
  for (const key of Object.keys(obj)) {
    if (!keySet.has(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function mapKeys(obj, keyMap) {
  const result = {};
  for (const key of Object.keys(obj)) {
    const newKey = keyMap[key] || key;
    result[newKey] = obj[key];
  }
  return result;
}

export function mapValues(obj, fn) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = fn(value, key);
  }
  return result;
}

export function groupBy(array, keyOrFn) {
  const fn = typeof keyOrFn === "function" ? keyOrFn : (item) => item[keyOrFn];
  const result = {};
  for (const item of array) {
    const key = String(fn(item));
    result[key] = result[key] || [];
    result[key].push(item);
  }
  return result;
}

export function indexBy(array, keyOrFn) {
  const fn = typeof keyOrFn === "function" ? keyOrFn : (item) => item[keyOrFn];
  const result = new Map();
  for (const item of array) {
    result.set(fn(item), item);
  }
  return result;
}

export function sortBy(array, keyOrFn, direction) {
  const fn = typeof keyOrFn === "function" ? keyOrFn : (item) => item[keyOrFn];
  const dir = direction === "desc" ? -1 : 1;
  return [...array].sort((a, b) => {
    const va = fn(a);
    const vb = fn(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

export function unique(array, keyOrFn) {
  if (!keyOrFn) {
    return [...new Set(array)];
  }
  const fn = typeof keyOrFn === "function" ? keyOrFn : (item) => item[keyOrFn];
  const seen = new Set();
  const result = [];
  for (const item of array) {
    const key = fn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

export function flatten(array) {
  return array.flat();
}

export function flattenDeep(array) {
  return array.flat(Infinity);
}

export function chunk(array, size) {
  if (size < 1) return [];
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

export function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function camelizeKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(camelizeKeys);
  }
  if (obj !== null && obj !== undefined && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[toCamelCase(key)] = camelizeKeys(value);
    }
    return result;
  }
  return obj;
}

export function snakifyKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(snakifyKeys);
  }
  if (obj !== null && obj !== undefined && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[toSnakeCase(key)] = snakifyKeys(value);
    }
    return result;
  }
  return obj;
}

export function deepMerge(target, source) {
  if (typeof target !== "object" || typeof source !== "object") return source;
  if (Array.isArray(source)) return source;
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      typeof value === "object" && value !== null && !Array.isArray(value) &&
      typeof result[key] === "object" && result[key] !== null
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function paginate(array, page, pageSize) {
  const total = array.length;
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = clamp(page, 1, totalPages || 1);
  const start = (currentPage - 1) * pageSize;
  const items = array.slice(start, start + pageSize);
  return {
    items,
    page: currentPage,
    pageSize,
    total,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}

// ---------------------------------------------------------------------------
// validate.scrml — validation rule builders + schema validator
// ---------------------------------------------------------------------------

export function validate(data, schema) {
  const errors = {};
  for (const field of Object.keys(schema)) {
    const value = data[field];
    const rules = schema[field];
    for (const rule of rules) {
      const result = rule.check(value, data);
      if (!result.valid) {
        errors[field] = errors[field] || [];
        errors[field].push(result.message);
      }
    }
  }
  return errors;
}

export function isValid(result) {
  return Object.keys(result).length === 0;
}

export function firstError(result, field) {
  const errs = result[field];
  // `not` in scrml lowers to `null` per emit-expr.ts. Mirror that here.
  return errs && errs.length > 0 ? errs[0] : null;
}

function makeRule(check) {
  return { check };
}

export function required(message) {
  return makeRule((value) => {
    const valid = value !== null && value !== undefined && value !== "";
    return { valid, message: message || "This field is required" };
  });
}

export function email(message) {
  return makeRule((value) => {
    if (!value) return { valid: true, message: "" };
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
    return { valid, message: message || "Enter a valid email address" };
  });
}

export function minLength(minVal, message) {
  return makeRule((value) => {
    if (!value) return { valid: true, message: "" };
    const valid = String(value).length >= minVal;
    return { valid, message: message || `Must be at least ${minVal} characters` };
  });
}

export function maxLength(maxVal, message) {
  return makeRule((value) => {
    if (!value) return { valid: true, message: "" };
    const valid = String(value).length <= maxVal;
    return { valid, message: message || `Must be at most ${maxVal} characters` };
  });
}

export function exactLength(len, message) {
  return makeRule((value) => {
    if (!value) return { valid: true, message: "" };
    const valid = String(value).length === len;
    return { valid, message: message || `Must be exactly ${len} characters` };
  });
}

export function pattern(regex, message) {
  return makeRule((value) => {
    if (!value) return { valid: true, message: "" };
    const valid = regex.test(String(value));
    return { valid, message: message || "Invalid format" };
  });
}

export function min(minimum, message) {
  return makeRule((value) => {
    const num = Number(value);
    const valid = !isNaN(num) && num >= minimum;
    return { valid, message: message || `Must be at least ${minimum}` };
  });
}

export function max(maximum, message) {
  return makeRule((value) => {
    const num = Number(value);
    const valid = !isNaN(num) && num <= maximum;
    return { valid, message: message || `Must be at most ${maximum}` };
  });
}

export function numeric(message) {
  return makeRule((value) => {
    if (value === "" || value === null || value === undefined) return { valid: true, message: "" };
    const valid = !isNaN(Number(value)) && value !== "";
    return { valid, message: message || "Must be a number" };
  });
}

export function integer(message) {
  return makeRule((value) => {
    if (value === "" || value === null || value === undefined) return { valid: true, message: "" };
    const valid = Number.isInteger(Number(value));
    return { valid, message: message || "Must be a whole number" };
  });
}

export function matches(fieldName, message) {
  return makeRule((value, data) => {
    const valid = value === data[fieldName];
    return { valid, message: message || `Must match ${fieldName}` };
  });
}

export function oneOf(allowedValues, message) {
  return makeRule((value) => {
    const valid = allowedValues.includes(value);
    return { valid, message: message || `Must be one of: ${allowedValues.join(", ")}` };
  });
}

export function url(message) {
  return makeRule((value) => {
    if (!value) return { valid: true, message: "" };
    try {
      new URL(String(value));
      return { valid: true, message: "" };
    } catch {
      return { valid: false, message: message || "Enter a valid URL" };
    }
  });
}

export function custom(fn) {
  return makeRule((value, data) => {
    const result = fn(value, data);
    if (result === true) return { valid: true, message: "" };
    return { valid: false, message: typeof result === "string" ? result : "Invalid value" };
  });
}

export function emailField() {
  return [required(), email()];
}

export function passwordField(minLen) {
  return [required(), minLength(minLen || 8)];
}

export function passwordConfirmField(fieldName) {
  return [required(), matches(fieldName || "password", "Passwords must match")];
}

// ---------------------------------------------------------------------------
// parse.scrml — parseVariant defensive fallback
//
// The compiler monomorphizes parseVariant at each call site (Path A — see
// SPEC §41.13 + L22). This export exists so name resolution (MOD) succeeds.
// If a call site reaches this body it means the codegen monomorphization
// failed to fire — surface as a clear runtime error rather than silent
// undefined behaviour.
// ---------------------------------------------------------------------------

export function parseVariant(_json, _T) {
  // Defensive fallback only — see header comment.
  throw new Error(
    "scrml:data parseVariant: internal — call site was not monomorphized at compile time."
  );
}

// ParseError shape used by the monomorphized call sites. Exposed for
// type imports + handler matching.
export const ParseError = Object.freeze({
  MissingDiscriminator: "MissingDiscriminator",
  UnknownVariant: "UnknownVariant",
  InvalidPayload: "InvalidPayload",
  Malformed: "Malformed",
});

// ---------------------------------------------------------------------------
// messages.scrml — thin wrappers around runtime helpers
//
// The runtime template defines _scrml_messages_register and
// _scrml_message_for in the `messages` chunk. The data shim's wrappers
// are functionally identical to the source-level scrml exports.
// ---------------------------------------------------------------------------

export function registerMessages(map) {
  // The runtime helper is a runtime global declared by the `messages`
  // chunk in compiler/src/runtime-template.js. Server side, the helper
  // is available because emit-server inlines the runtime for any file
  // touching validators. Client side, the shim is reached via the
  // `_scrml_stdlib.data` registry which runs AFTER the runtime is set up.
  if (typeof _scrml_messages_register === "function") {
    _scrml_messages_register(map);
  }
}

export function messageFor(error, fieldName, cellName) {
  if (typeof _scrml_message_for === "function") {
    return _scrml_message_for(error, fieldName, cellName);
  }
  // Fallback when the messages chunk was tree-shaken — return a stub.
  return String(error?.tag || error || "");
}

// ---------------------------------------------------------------------------
// form-for.scrml — formFor stub + registerLabels wrapper
//
// formFor: canonical usage is the markup element form <formFor for=Struct/>;
// the compiler's type-system stage rewrites every element before any code
// emission. If a call site reaches this body it means the rewrite failed —
// surface as a clear runtime error rather than silent undefined behaviour.
//
// registerLabels: thin wrapper around the _scrml_labels_register helper in
// the runtime template's 'messages' chunk (co-located — see runtime-
// template.js §41.14.7 block). Mirrors registerMessages — no-op when the
// helper is absent (tree-shaken away).
// ---------------------------------------------------------------------------

export function formFor(_StructType, _options) {
  // Defensive fallback only — see header comment.
  throw new Error(
    "scrml:data formFor: internal — call site was not rewritten at compile time. " +
    "The canonical usage is the markup element form <formFor for=Struct .../>; " +
    "the bare-call form is reserved for v1.next per SPEC §41.14."
  );
}

export function registerLabels(map) {
  // The runtime helper is defined by the 'messages' chunk in runtime-template.js
  // (co-located with the messages registry — see §41.14.7 block). Server side,
  // the helper is available because emit-server inlines the runtime for any
  // file touching validators OR formFor. Client side, this shim is reached via
  // the `_scrml_stdlib.data` registry which runs AFTER the runtime is set up.
  // No-op when the helper is tree-shaken away (consistent with registerMessages).
  if (typeof _scrml_labels_register === "function") {
    _scrml_labels_register(map);
  }
}
