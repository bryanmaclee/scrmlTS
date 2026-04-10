/**
 * stdlib-auth — unit tests for scrml:auth
 *
 * Tests decodeJwt (pure), createRateLimiter (pure in-memory),
 * generatePassword (pure), and JWT sign/verify via extracted logic.
 *
 * server {} block functions (signJwt, verifyJwt, hashPassword, verifyPassword,
 * generateTotpSecret, verifyTotp) are tested structurally here — the
 * crypto.subtle implementation is tested via the extracted async functions.
 *
 * Coverage:
 *   A1   decodeJwt — decodes valid JWT payload
 *   A2   decodeJwt — returns null for malformed token
 *   A3   decodeJwt — returns null for null input
 *   A4   decodeJwt — returns null for empty string
 *   A5   decodeJwt — returns null for wrong number of parts
 *   A6   createRateLimiter — first request allowed
 *   A7   createRateLimiter — remaining decrements per request
 *   A8   createRateLimiter — request beyond max is blocked
 *   A9   createRateLimiter — remaining is 0 when blocked
 *   A10  createRateLimiter — different keys are independent
 *   A11  createRateLimiter — reset() clears counter
 *   A12  createRateLimiter — peek() does not increment
 *   A13  generatePassword — default length 16
 *   A14  generatePassword — custom length
 *   A15  generatePassword — two calls produce different passwords
 *   A16  signJwt + verifyJwt — valid token verifies correctly
 *   A17  signJwt + verifyJwt — expired token returns valid:false reason:expired
 *   A18  verifyJwt — tampered token returns valid:false reason:invalid
 *   A19  verifyJwt — malformed token returns valid:false reason:malformed
 */

import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// Extracted pure implementations
// ---------------------------------------------------------------------------

function base64urlEncode(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let str = ""
    for (const b of bytes) str += String.fromCharCode(b)
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function base64urlDecode(str) {
    let s = str.replace(/-/g, "+").replace(/_/g, "/")
    while (s.length % 4) s += "="
    const binary = atob(s)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

function decodeJwt(token) {
    if (!token || typeof token !== "string") return null
    const parts = token.split(".")
    if (parts.length !== 3) return null
    try {
        const bytes = base64urlDecode(parts[1])
        const json = new TextDecoder().decode(bytes)
        return JSON.parse(json)
    } catch(e) {
        return null
    }
}

async function signJwt(payload, secret, expiresIn) {
    const now = Math.floor(Date.now() / 1000)
    const exp = now + (expiresIn !== undefined ? expiresIn : 3600)
    const header = { alg: "HS256", typ: "JWT" }
    const claims = { ...payload, iat: now, exp }
    const headerStr = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)))
    const payloadStr = base64urlEncode(new TextEncoder().encode(JSON.stringify(claims)))
    const signingInput = `${headerStr}.${payloadStr}`
    const keyData = new TextEncoder().encode(secret)
    const cryptoKey = await crypto.subtle.importKey(
        "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signingInput))
    return `${signingInput}.${base64urlEncode(signatureBuffer)}`
}

async function verifyJwt(token, secret) {
    const decoded = decodeJwt(token)
    if (!decoded) return { valid: false, reason: "malformed" }
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now) return { valid: false, reason: "expired" }
    try {
        const parts = token.split(".")
        if (parts.length !== 3) return { valid: false, reason: "malformed" }
        const signingInput = `${parts[0]}.${parts[1]}`
        const keyData = new TextEncoder().encode(secret)
        const cryptoKey = await crypto.subtle.importKey(
            "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        )
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signingInput))
        const actualSig = base64urlEncode(signatureBuffer)
        if (actualSig !== parts[2]) return { valid: false, reason: "invalid" }
        return { valid: true, payload: decoded }
    } catch(e) {
        return { valid: false, reason: "invalid" }
    }
}

function createRateLimiter(options) {
    const windowMs = (options && options.windowMs) || 15 * 60 * 1000
    const max = (options && options.max) || 10
    const store = new Map()
    return {
        check(key) {
            const now = Date.now()
            let entry = store.get(key)
            if (!entry || entry.resetAt <= now) {
                entry = { count: 0, resetAt: now + windowMs }
                store.set(key, entry)
            }
            entry.count++
            const allowed = entry.count <= max
            const remaining = Math.max(0, max - entry.count)
            return { allowed, remaining, resetAt: entry.resetAt }
        },
        reset(key) { store.delete(key) },
        peek(key) {
            const now = Date.now()
            const entry = store.get(key)
            if (!entry || entry.resetAt <= now) return { count: 0, remaining: max, resetAt: now + windowMs }
            return { count: entry.count, remaining: Math.max(0, max - entry.count), resetAt: entry.resetAt }
        }
    }
}

function generatePassword(length, options) {
    const len = length || 16
    const opts = options || {}
    const useUppercase = opts.uppercase !== false
    const useNumbers = opts.numbers !== false
    const useSymbols = opts.symbols !== false
    let chars = "abcdefghijklmnopqrstuvwxyz"
    if (useUppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if (useNumbers)   chars += "0123456789"
    if (useSymbols)   chars += "!@#$%^&*()-_=+[]{}|;:,.<>?"
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    let result = ""
    for (const b of bytes) result += chars[b % chars.length]
    return result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("scrml:auth — decodeJwt()", () => {
    // Build a test token manually
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
    const payload = btoa(JSON.stringify({ sub: "123", name: "Alice", role: "admin" }))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
    const testToken = `${header}.${payload}.fakesig`

    test("A1: decodes valid JWT payload", () => {
        const p = decodeJwt(testToken)
        expect(p).not.toBeNull()
        expect(p.sub).toBe("123")
        expect(p.name).toBe("Alice")
        expect(p.role).toBe("admin")
    })

    test("A2: returns null for malformed base64", () => {
        expect(decodeJwt("head.!!!.sig")).toBeNull()
    })

    test("A3: returns null for null input", () => {
        expect(decodeJwt(null)).toBeNull()
    })

    test("A4: returns null for empty string", () => {
        expect(decodeJwt("")).toBeNull()
    })

    test("A5: returns null for wrong number of parts", () => {
        expect(decodeJwt("only.two")).toBeNull()
        expect(decodeJwt("too.many.parts.here")).toBeNull()
    })
})

describe("scrml:auth — createRateLimiter()", () => {
    test("A6: first request allowed", () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 5 })
        const result = limiter.check("user@test.com")
        expect(result.allowed).toBe(true)
    })

    test("A7: remaining decrements per request", () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 3 })
        const r1 = limiter.check("key1")
        expect(r1.remaining).toBe(2)
        const r2 = limiter.check("key1")
        expect(r2.remaining).toBe(1)
        const r3 = limiter.check("key1")
        expect(r3.remaining).toBe(0)
    })

    test("A8: request beyond max is blocked", () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 2 })
        limiter.check("key2")
        limiter.check("key2")
        const r3 = limiter.check("key2")
        expect(r3.allowed).toBe(false)
    })

    test("A9: remaining is 0 when blocked", () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 1 })
        limiter.check("key3")
        const r2 = limiter.check("key3")
        expect(r2.remaining).toBe(0)
        expect(r2.allowed).toBe(false)
    })

    test("A10: different keys are independent", () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 1 })
        const r1 = limiter.check("alice@test.com")
        expect(r1.allowed).toBe(true)
        const r2 = limiter.check("bob@test.com")
        expect(r2.allowed).toBe(true)
    })

    test("A11: reset() clears counter for key", () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 2 })
        limiter.check("key4")
        limiter.check("key4")
        limiter.reset("key4")
        const r = limiter.check("key4")
        expect(r.allowed).toBe(true)
        expect(r.remaining).toBe(1)
    })

    test("A12: peek() does not increment counter", () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 3 })
        const before = limiter.peek("key5")
        expect(before.count).toBe(0)
        expect(before.remaining).toBe(3)
        // peek again — should not increment
        const again = limiter.peek("key5")
        expect(again.count).toBe(0)
    })
})

describe("scrml:auth — generatePassword()", () => {
    test("A13: default length is 16", () => {
        const pw = generatePassword()
        expect(pw.length).toBe(16)
    })

    test("A14: custom length", () => {
        expect(generatePassword(24).length).toBe(24)
        expect(generatePassword(8).length).toBe(8)
    })

    test("A15: two calls produce different passwords", () => {
        const a = generatePassword(16)
        const b = generatePassword(16)
        expect(a).not.toBe(b)
    })
})

describe("scrml:auth — signJwt + verifyJwt (via extracted crypto logic)", () => {
    const secret = "test-secret-key-for-unit-tests"

    test("A16: valid token signs and verifies correctly", async () => {
        const token = await signJwt({ userId: 42, role: "user" }, secret, 3600)
        expect(typeof token).toBe("string")
        expect(token.split(".")).toHaveLength(3)

        const result = await verifyJwt(token, secret)
        expect(result.valid).toBe(true)
        expect(result.payload.userId).toBe(42)
        expect(result.payload.role).toBe("user")
    })

    test("A17: expired token returns valid:false reason:expired", async () => {
        const token = await signJwt({ userId: 1 }, secret, -1)  // expired 1 second ago
        const result = await verifyJwt(token, secret)
        expect(result.valid).toBe(false)
        expect(result.reason).toBe("expired")
    })

    test("A18: tampered token returns valid:false reason:invalid", async () => {
        const token = await signJwt({ userId: 1 }, secret, 3600)
        const parts = token.split(".")
        // Tamper: change the last character of the signature
        const tamperedSig = parts[2].slice(0, -1) + (parts[2].slice(-1) === "A" ? "B" : "A")
        const tampered = `${parts[0]}.${parts[1]}.${tamperedSig}`
        const result = await verifyJwt(tampered, secret)
        expect(result.valid).toBe(false)
        expect(result.reason).toBe("invalid")
    })

    test("A19: malformed token returns valid:false reason:malformed", async () => {
        const result = await verifyJwt("not.a.valid.jwt.at.all", secret)
        expect(result.valid).toBe(false)
        expect(result.reason).toBe("malformed")
    })
})
