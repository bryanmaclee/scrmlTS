// scrml:auth — runtime shim
//
// Hand-written ES module that mirrors the semantics declared in
// stdlib/auth/index.scrml + ./jwt.scrml + ./password.scrml.
// Used by the compiler's stdlib bundler to make `import { ... } from "scrml:auth"`
// resolvable at runtime.
//
// This shim replaces the would-be compiled output of stdlib/auth/*.scrml
// because those source files contain `server {}` blocks that the standard
// compile pipeline cannot lower at TS time today (separate M16 gap).
//
// Surface (must match stdlib/auth re-exports):
//   - hashPassword(password)                  → Promise<string>          [server-only]
//   - verifyPassword(password, hash)          → Promise<boolean>         [server-only]
//   - generatePassword(length, options)       → string                   [pure]
//   - signJwt(payload, secret, expiresIn)     → Promise<string>          [server/browser]
//   - verifyJwt(token, secret)                → Promise<{valid,payload?,reason?}>
//   - decodeJwt(token)                        → object|null              [pure]
//   - createRateLimiter(options)              → { check, reset, peek }   [pure in-memory]
//   - generateTotpSecret(options)             → { secret, otpauthUrl }
//   - verifyTotp(code, secret)                → Promise<boolean>
//
// Functions marked `server-only` use Bun-only APIs (Bun.password.*) and will
// throw when called in a browser context. The dispatch app's existing role
// inference (RI) routes them to server functions only — see SPEC §41.

// ---------------------------------------------------------------------------
// password.scrml — Argon2id hash + verify, random password generation
// ---------------------------------------------------------------------------

export async function hashPassword(password) {
  // Argon2id via Bun.password (server-only). Mirrors stdlib/auth/password.scrml
  // line 25-29.
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export async function verifyPassword(password, hash) {
  // Constant-time verify. Mirrors stdlib/auth/password.scrml line 44-52.
  try {
    return await Bun.password.verify(password, hash);
  } catch (e) {
    return false;
  }
}

export function generatePassword(length, options) {
  // Mirrors stdlib/auth/password.scrml line 66-86. Pure, browser-safe.
  const len = length || 16;
  const opts = options || {};
  const useUppercase = opts.uppercase !== false;
  const useNumbers = opts.numbers !== false;
  const useSymbols = opts.symbols !== false;

  let chars = "abcdefghijklmnopqrstuvwxyz";
  if (useUppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (useNumbers) chars += "0123456789";
  if (useSymbols) chars += "!@#$%^&*()-_=+[]{}|;:,.<>?";

  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);

  let result = "";
  for (const b of bytes) {
    result += chars[b % chars.length];
  }
  return result;
}

// ---------------------------------------------------------------------------
// jwt.scrml — HS256 JWT sign + verify + decode
// ---------------------------------------------------------------------------

function _base64urlEncode(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function _base64urlDecode(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signJwt(payload, secret, expiresIn) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresIn !== undefined ? expiresIn : 3600);
  const header = { alg: "HS256", typ: "JWT" };
  const claims = { ...payload, iat: now, exp };
  const headerStr = _base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadStr = _base64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const signingInput = `${headerStr}.${payloadStr}`;
  const keyData = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC", cryptoKey, new TextEncoder().encode(signingInput)
  );
  const signatureStr = _base64urlEncode(signatureBuffer);
  return `${signingInput}.${signatureStr}`;
}

export async function verifyJwt(token, secret) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "malformed" };
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "malformed" };
  }
  const [headerStr, payloadStr, signatureStr] = parts;
  const signingInput = `${headerStr}.${payloadStr}`;

  let payload;
  try {
    const bytes = _base64urlDecode(payloadStr);
    const json = new TextDecoder().decode(bytes);
    payload = JSON.parse(json);
  } catch (e) {
    return { valid: false, reason: "malformed" };
  }

  // Check expiry first (before signature) so expired tokens get the right reason
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "expired" };
  }

  // Verify HMAC
  try {
    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const signature = _base64urlDecode(signatureStr);
    const ok = await crypto.subtle.verify(
      "HMAC", cryptoKey, signature, new TextEncoder().encode(signingInput)
    );
    if (!ok) return { valid: false, reason: "invalid" };
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: "invalid" };
  }
}

export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const bytes = _base64urlDecode(parts[1]);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// index.scrml — rate limiter (in-memory) and TOTP (RFC 6238)
// ---------------------------------------------------------------------------

export function createRateLimiter(options) {
  // Mirrors stdlib/auth/index.scrml line 40-87. In-memory, non-persistent.
  const windowMs = (options && options.windowMs) || 15 * 60 * 1000;
  const max = (options && options.max) || 10;
  const store = new Map();

  return {
    check(key) {
      const now = Date.now();
      let entry = store.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }
      entry.count++;
      const allowed = entry.count <= max;
      const remaining = Math.max(0, max - entry.count);
      return { allowed, remaining, resetAt: entry.resetAt };
    },
    reset(key) {
      store.delete(key);
    },
    peek(key) {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || entry.resetAt <= now) {
        return { count: 0, remaining: max, resetAt: now + windowMs };
      }
      return {
        count: entry.count,
        remaining: Math.max(0, max - entry.count),
        resetAt: entry.resetAt,
      };
    },
  };
}

export function generateTotpSecret(options) {
  // Mirrors stdlib/auth/index.scrml line 106-132.
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);

  const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      secret += BASE32[(buffer >> bitsLeft) & 31];
    }
  }
  if (bitsLeft > 0) secret += BASE32[(buffer << (5 - bitsLeft)) & 31];

  const issuer = (options && options.issuer) || "scrml";
  const account = (options && options.account) || "user";
  const otpauthUrl =
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

  return { secret, otpauthUrl };
}

export async function verifyTotp(code, secret) {
  // Mirrors stdlib/auth/index.scrml line 148-161 + 167-210.
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const counter = Math.floor(now / timeStep);

  for (const offset of [-1, 0, 1]) {
    const expected = await _hotpGenerate(secret, counter + offset);
    if (expected === code) return true;
  }
  return false;
}

async function _hotpGenerate(base32Secret, counter) {
  const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32Secret.toUpperCase()) {
    const idx = BASE32.indexOf(char);
    if (idx >= 0) bits += idx.toString(2).padStart(5, "0");
  }
  const keyBytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBytes.length; i++) {
    keyBytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }

  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(0, 0, false);
  view.setUint32(4, counter >>> 0, false);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const hmacBuffer = await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer);
  const hmac = new Uint8Array(hmacBuffer);

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, "0");
}
