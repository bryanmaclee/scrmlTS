// scrml:math — runtime shim
//
// Hand-written ES module mirroring stdlib/math/index.scrml. Every function is
// PURE: deterministic, no side effects, no host capability. This is the ONE
// sanctioned, centralized touch of the host `Math.*` / `Number.*` surface —
// scrml's own stdlib routes its internal arithmetic through here (closing the
// stdlib-ouroboros) and adopters reach these instead of raw `Math.round(...)`.
//
// Because every member is pure, all are callable inside pure `fn` bodies.
//
// Surface (must match stdlib/math/index.scrml exports):
//   - round(n)
//   - floor(n)
//   - ceil(n)
//   - abs(n)
//   - min(...values)
//   - max(...values)
//   - clamp(value, minimum, maximum)
//   - parseInt(str, radix?)      radix defaults to 10
//   - parseFloat(str)
//   - toNumber(value)            whole-value coercion (Number(value))
//   - isNaN(value)               Number.isNaN — no coercion

export function round(n) {
  return Math.round(n);
}

export function floor(n) {
  return Math.floor(n);
}

export function ceil(n) {
  return Math.ceil(n);
}

export function abs(n) {
  return Math.abs(n);
}

export function min(...values) {
  return Math.min(...values);
}

export function max(...values) {
  return Math.max(...values);
}

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function parseInt(str, radix) {
  return Number.parseInt(str, radix !== null && radix !== undefined ? radix : 10);
}

export function parseFloat(str) {
  return Number.parseFloat(str);
}

export function toNumber(value) {
  return Number(value);
}

export function isNaN(value) {
  return Number.isNaN(value);
}
